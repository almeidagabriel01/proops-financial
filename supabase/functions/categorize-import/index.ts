// DENO RUNTIME — not Node.js!
// Async categorization engine for imported transactions.
// Implements 3-tier hierarchy: user dictionary → global cache → Claude Haiku.
// Invoked by /api/import as fire-and-forget after saving transactions.
// arch sections 4.2, 5.1, 5.2

// NOTE: Uses Deno.serve() (modern Supabase Edge Function API).
// Do NOT use serve() from deno.land/std — it is deprecated.

import { createClient } from 'npm:@supabase/supabase-js@2';
import Anthropic from 'npm:@anthropic-ai/sdk@0.36.3';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PendingTransaction {
  id: string;
  description: string;
  amount: number;
}

const VALID_CATEGORIES = new Set([
  'alimentacao', 'delivery', 'transporte', 'moradia', 'saude',
  'educacao', 'lazer', 'compras', 'assinaturas', 'transferencias',
  'salario', 'investimentos', 'impostos', 'outros',
]);

const CONFIDENCE_THRESHOLD = 0.7;
const CHUNK_SIZE = 100;

// ─── Description normalization (mirrors SQL normalize_description()) ───────────

function normalizeDescription(raw: string): string {
  return raw
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// ─── Prompt templates (arch section 5.2) ─────────────────────────────────────

const CATEGORIZE_SYSTEM = `Voce e um classificador de transacoes financeiras brasileiras.

CATEGORIAS DISPONIVEIS:
- alimentacao (supermercados, restaurantes, padarias)
- delivery (iFood, Rappi, Uber Eats, 99Food)
- transporte (Uber, 99, combustivel, estacionamento, pedagio)
- moradia (aluguel, condominio, IPTU, energia, agua, gas, internet)
- saude (farmacias, consultas, plano de saude, exames)
- educacao (escola, faculdade, cursos, livros)
- lazer (cinema, streaming, jogos, viagens, bares)
- compras (roupas, eletronicos, Mercado Livre, Amazon, Shopee)
- assinaturas (Netflix, Spotify, iCloud, gym)
- transferencias (PIX enviado, TED, DOC — entre pessoas)
- salario (salario, freelance, renda, deposito recorrente)
- investimentos (aplicacao, resgate, corretora)
- impostos (IR, IPVA, IPTU, DAS, taxas governamentais)
- outros (nao se encaixa em nenhuma acima)

REGRAS:
- Responda APENAS com JSON, sem explicacao
- Use a descricao para inferir a categoria
- Na duvida, use "outros"
- Considere o contexto brasileiro`;

const CATEGORIZE_USER = (transactions: { id: string; description: string; amount: number }[]) =>
  `Classifique estas transacoes:\n${JSON.stringify(transactions)}\n\nResponda no formato: [{"id": "...", "category": "...", "confidence": 0.95}]`;

// ─── Tier 1: User dictionary lookup (table: category_dictionary) ──────────────

async function lookupUserDictionary(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  userId: string,
  transactions: PendingTransaction[],
): Promise<Map<string, { category: string; source: 'user' }>> {
  const results = new Map<string, { category: string; source: 'user' }>();
  if (transactions.length === 0) return results;

  const normalizedDescs = transactions.map((t) => normalizeDescription(t.description));

  const { data, error } = await supabase
    .from('category_dictionary')
    .select('description_pattern, category')
    .eq('user_id', userId)
    .in('description_pattern', normalizedDescs);

  if (error) {
    console.error('[categorize-import] Tier 1 lookup error:', error);
    return results;
  }

  const dictMap = new Map((data ?? []).map((r: { description_pattern: string; category: string }) => [r.description_pattern, r.category]));

  for (const tx of transactions) {
    const normalized = normalizeDescription(tx.description);
    const category = dictMap.get(normalized);
    if (category) {
      results.set(tx.id, { category, source: 'user' });
    }
  }

  return results;
}

// ─── Tier 2: Global cache lookup (table: category_cache) ──────────────────────

async function lookupGlobalCache(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  transactions: PendingTransaction[],
): Promise<Map<string, { category: string; confidence: number | null; source: 'cache' }>> {
  const results = new Map<string, { category: string; confidence: number | null; source: 'cache' }>();
  if (transactions.length === 0) return results;

  const normalizedDescs = transactions.map((t) => normalizeDescription(t.description));

  const { data, error } = await supabase
    .from('category_cache')
    .select('description_normalized, category, confidence')
    .in('description_normalized', normalizedDescs);

  if (error) {
    console.error('[categorize-import] Tier 2 lookup error:', error);
    return results;
  }

  const cacheMap = new Map(
    (data ?? []).map((r: { description_normalized: string; category: string; confidence: number | null }) => [
      r.description_normalized,
      { category: r.category, confidence: r.confidence },
    ]),
  );

  for (const tx of transactions) {
    const normalized = normalizeDescription(tx.description);
    const hit = cacheMap.get(normalized);
    if (hit) {
      results.set(tx.id, { category: hit.category, confidence: hit.confidence, source: 'cache' });
    }
  }

  return results;
}

// ─── Tier 3: Claude Haiku batch call ─────────────────────────────────────────

async function categorizeBatchHaiku(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  transactions: PendingTransaction[],
): Promise<Map<string, { category: string; confidence: number }>> {
  const results = new Map<string, { category: string; confidence: number }>();
  if (transactions.length === 0) return results;

  const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') });

  let rawResponse = '[]';
  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      messages: [{ role: 'user', content: CATEGORIZE_USER(transactions) }],
      system: CATEGORIZE_SYSTEM,
    });
    const textBlock = response.content.find((b: { type: string }) => b.type === 'text') as { type: 'text'; text: string } | undefined;
    rawResponse = textBlock?.text ?? '[]';
  } catch (err) {
    console.error('[categorize-import] Tier 3 Haiku call failed:', err);
    for (const t of transactions) {
      results.set(t.id, { category: 'outros', confidence: 0 });
    }
    return results;
  }

  let parsed: { id: string; category: string; confidence: number }[];
  try {
    const json = rawResponse.replace(/^```json?\n?|```$/gm, '').trim();
    parsed = JSON.parse(json);
  } catch {
    console.error('[categorize-import] Tier 3 parse error — raw:', rawResponse);
    for (const t of transactions) {
      results.set(t.id, { category: 'outros', confidence: 0 });
    }
    return results;
  }

  const parsedMap = new Map(parsed.map((p) => [p.id, p]));
  const cacheUpserts: { description_normalized: string; category: string; confidence: number }[] = [];

  for (const t of transactions) {
    const hit = parsedMap.get(t.id);
    const confidence = hit?.confidence ?? 0;
    const rawCategory = hit?.category ?? 'outros';
    const category =
      VALID_CATEGORIES.has(rawCategory) && confidence >= CONFIDENCE_THRESHOLD ? rawCategory : 'outros';

    results.set(t.id, { category, confidence });

    if (VALID_CATEGORIES.has(rawCategory) && confidence >= CONFIDENCE_THRESHOLD) {
      cacheUpserts.push({
        description_normalized: normalizeDescription(t.description),
        category,
        confidence,
      });
    }
  }

  // Upsert into category_cache (fire-and-forget)
  if (cacheUpserts.length > 0) {
    supabase
      .from('category_cache')
      .upsert(cacheUpserts, { onConflict: 'description_normalized', ignoreDuplicates: false })
      .then(({ error }: { error: unknown }) => {
        if (error) console.error('[categorize-import] cache upsert error:', error);
      });
  }

  return results;
}

// ─── Batch save categorizations ───────────────────────────────────────────────

async function saveTransactionUpdates(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  updates: Array<{
    id: string;
    category: string;
    category_source: 'ai' | 'user' | 'cache';
    category_confidence: number | null;
  }>,
): Promise<void> {
  if (updates.length === 0) return;

  const chunks: typeof updates[] = [];
  for (let i = 0; i < updates.length; i += CHUNK_SIZE) {
    chunks.push(updates.slice(i, i + CHUNK_SIZE));
  }

  await Promise.all(
    chunks.map((chunk) =>
      Promise.all(
        chunk.map(async (u) => {
          const { error } = await supabase
            .from('transactions')
            .update({
              category: u.category,
              category_source: u.category_source,
              category_confidence: u.category_confidence,
            })
            .eq('id', u.id);

          if (error) {
            console.error('[categorize-import] tx update error for', u.id, error);
          }
        }),
      ),
    ),
  );
}

// ─── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  try {
    const { importId, userId } = await req.json();

    if (!importId || !userId) {
      return new Response(
        JSON.stringify({ error: 'importId and userId are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Load all pending transactions for this import
    const { data: pendingTxs, error: fetchError } = await supabase
      .from('transactions')
      .select('id, description, amount')
      .eq('import_id', importId)
      .eq('category_source', 'pending');

    if (fetchError) {
      console.error('[categorize-import] fetch pending transactions error:', fetchError);
      await supabase
        .from('imports')
        .update({ status: 'failed', error_message: 'Erro ao carregar transacoes pendentes' })
        .eq('id', importId);
      return new Response(JSON.stringify({ error: 'fetch error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const pending: PendingTransaction[] = pendingTxs ?? [];
    console.log('[categorize-import] pending transactions:', pending.length);

    if (pending.length === 0) {
      await supabase.from('imports').update({ status: 'completed' }).eq('id', importId);
      return new Response(JSON.stringify({ success: true, categorized: 0 }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // ── Tier 1: User dictionary ──────────────────────────────────────────────
    const userHits = await lookupUserDictionary(supabase, userId, pending);
    const afterTier1 = pending.filter((t) => !userHits.has(t.id));
    console.log('[categorize-import] Tier 1 hits:', userHits.size, 'remaining:', afterTier1.length);

    // ── Tier 2: Global cache ─────────────────────────────────────────────────
    const cacheHits = await lookupGlobalCache(supabase, afterTier1);
    const afterTier2 = afterTier1.filter((t) => !cacheHits.has(t.id));
    console.log('[categorize-import] Tier 2 hits:', cacheHits.size, 'remaining:', afterTier2.length);

    // ── Tier 3: Claude Haiku ─────────────────────────────────────────────────
    const aiResults = await categorizeBatchHaiku(supabase, afterTier2);
    console.log('[categorize-import] Tier 3 categorized:', aiResults.size);

    // ── Build and save all updates ───────────────────────────────────────────
    const updates: Array<{
      id: string;
      category: string;
      category_source: 'ai' | 'user' | 'cache';
      category_confidence: number | null;
    }> = [];

    for (const [id, hit] of userHits) {
      updates.push({ id, category: hit.category, category_source: 'user', category_confidence: null });
    }
    for (const [id, hit] of cacheHits) {
      updates.push({ id, category: hit.category, category_source: 'cache', category_confidence: hit.confidence });
    }
    for (const [id, hit] of aiResults) {
      updates.push({ id, category: hit.category, category_source: 'ai', category_confidence: hit.confidence > 0 ? hit.confidence : null });
    }

    await saveTransactionUpdates(supabase, updates);

    // Mark import as completed
    const { error: completeError } = await supabase
      .from('imports')
      .update({ status: 'completed' })
      .eq('id', importId);

    if (completeError) {
      console.error('[categorize-import] complete status update error:', completeError);
    }

    console.log('[categorize-import] done — total categorized:', updates.length);

    return new Response(JSON.stringify({ success: true, categorized: updates.length }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[categorize-import] unhandled error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
