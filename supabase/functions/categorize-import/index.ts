// DENO RUNTIME — not Node.js!
// Async categorization engine for imported transactions.
// Implements 3-tier hierarchy: user dictionary → global cache → keyword-rule stub.
// Invoked by /api/import as fire-and-forget after saving transactions.
// arch sections 4.2, 5.1, 5.2
//
// Tier 3 is currently a keyword-rule stub (no external API).
// When real AI is enabled: replace categorizeBatchKeywords with a
// Claude Haiku call using CATEGORIZE_SYSTEM/CATEGORIZE_USER from
// src/lib/ai/prompts/categorize.ts. Keep keyword rules in sync.

// NOTE: Uses Deno.serve() (modern Supabase Edge Function API).
// Do NOT use serve() from deno.land/std — it is deprecated.

import { createClient } from 'npm:@supabase/supabase-js@2';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PendingTransaction {
  id: string;
  description: string;
  amount: number;
}

const STUB_CONFIDENCE = 0.8; // Fixed confidence for keyword-matched results
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

// ─── Keyword rules (Tier 3 stub) — kept in sync with src/lib/ai/categorizer.ts ─
//
// Rules operate on the NORMALIZED description (lowercase, no accents/specials).
// Ordering is intentional:
//   - delivery BEFORE transporte ("uber eats" → delivery, "uber" → transporte)
//   - transferencias BEFORE moradia ("pix recarga tim" → transferencias, not moradia)
//   - "amazon prime" inside assinaturas BEFORE "amazon " in compras
//   - iptu ONLY in impostos (not moradia)
//   - Gaming (xbox/playstation/steam) goes to lazer, not assinaturas

const KEYWORD_RULES: Array<{ keywords: string[]; category: string }> = [
  {
    keywords: ['ifood', 'rappi', 'uber eats', '99food', 'james ', 'loggi'],
    category: 'delivery',
  },
  {
    keywords: [
      'uber', '99 ', 'cabify', 'estacionamento', 'pedagio',
      'metro ', 'sptrans', 'bilhete unico',
      'gasolina', 'etanol', 'combustivel',
      'posto ', 'shell ', 'ipiranga', 'petrobras',
    ],
    category: 'transporte',
  },
  {
    keywords: [
      'supermercado', 'hipermercado', 'carrefour', 'extra ',
      'pao de acucar', 'atacadao', 'assai', 'hortifrutti', 'hortifruti',
      'restaurante', 'padaria', 'lanchonete',
      'mc donalds', 'mcdonalds', 'burger', 'churrascaria', 'pizzaria',
      'sushi', 'acougue', 'mercearia', 'sacolao',
    ],
    category: 'alimentacao',
  },
  {
    keywords: [
      'netflix', 'spotify', 'amazon prime', 'icloud', 'disney',
      'hbo ', 'globoplay', 'apple tv', 'deezer', 'youtube premium',
      'crunchyroll', 'academia', 'smartfit', 'smart fit',
    ],
    category: 'assinaturas',
  },
  {
    keywords: [
      'farmacia', 'drogaria', 'droga raia', 'drogasil', 'ultrafarma',
      'pacheco', 'nissei', 'clinica', 'consulta', 'medico', 'dentista',
      'laboratorio', 'hospital', 'unimed', 'amil', 'hapvida',
      'plano saude', 'exame ', 'fisioterapia', 'droga ',
    ],
    category: 'saude',
  },
  {
    keywords: [
      'mercado livre', 'shopee', 'aliexpress', 'magalu', 'magazine luiza',
      'americanas', 'renner', 'ca moda', 'zara', 'hm ', 'riachuelo',
      'kabum', 'submarino', 'ponto frio', 'casas bahia',
      'amazon marketplace', 'amazon ',
    ],
    category: 'compras',
  },
  {
    keywords: ['pix ', 'ted ', 'doc ', 'transferencia', 'emprestimo'],
    category: 'transferencias',
  },
  {
    keywords: [
      'aluguel', 'condominio', 'energia ', 'cpfl', 'enel', 'cemig',
      'light ', 'eletrobras', 'sabesp', 'comgas', 'copasa', 'sanepar',
      'gas ', 'vivo ', 'claro ', 'net ', 'oi ', 'tim ', 'fibra',
    ],
    category: 'moradia',
  },
  {
    keywords: [
      'faculdade', 'universidade', 'escola ', 'colegio', 'mensalidade',
      'udemy', 'alura', 'coursera', 'curso ', 'treinamento', 'pearson', 'apostila',
    ],
    category: 'educacao',
  },
  {
    keywords: [
      'cinema', 'teatro', 'show ', 'ingresso', 'bilheteria',
      'pousada', 'hotel ', 'hospedagem', 'viagem', 'turismo',
      'bar ', 'balada', 'steam ', 'xbox', 'playstation', 'nintendo',
      'jogos', 'lazer', 'cervejaria', 'ticketmaster', 'sympla', 'gamepass',
    ],
    category: 'lazer',
  },
  {
    keywords: [
      'salario', 'freelance', 'deposito renda', 'renda mensal',
      'decimo terceiro', 'bonus ', 'remuneracao', 'pro labore',
    ],
    category: 'salario',
  },
  {
    keywords: [
      'investimento', 'tesouro direto', 'tesouro selic',
      'cdb', 'lci', 'lca', 'fii', 'acoes', 'corretora',
      'xp ', 'rico ', 'clear ', 'nuinvest', 'caixinha', 'rendimento',
      'resgate', 'aplicacao',
    ],
    category: 'investimentos',
  },
  {
    keywords: [
      'imposto', 'ipva', 'iptu', 'iof', 'darf', 'das ', 'mei ',
      'taxa ', 'tributo', 'receita federal', 'detran', 'sefaz',
    ],
    category: 'impostos',
  },
];

function categorizeByKeywords(description: string): { category: string; confidence: number } {
  const normalized = normalizeDescription(description);
  for (const rule of KEYWORD_RULES) {
    for (const keyword of rule.keywords) {
      if (normalized.includes(keyword)) {
        return { category: rule.category, confidence: STUB_CONFIDENCE };
      }
    }
  }
  return { category: 'outros', confidence: 0 };
}

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

// ─── Tier 3: Keyword-rule stub ────────────────────────────────────────────────
// Uses ordered keyword matching — no external API call.
// Saves non-'outros' results to category_cache for Tier 2 reuse.

async function categorizeBatchKeywords(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  transactions: PendingTransaction[],
): Promise<Map<string, { category: string; confidence: number }>> {
  const results = new Map<string, { category: string; confidence: number }>();
  if (transactions.length === 0) return results;

  const cacheUpserts: { description_normalized: string; category: string; confidence: number }[] = [];

  for (const t of transactions) {
    const { category, confidence } = categorizeByKeywords(t.description);
    results.set(t.id, { category, confidence });

    if (category !== 'outros') {
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

    // ── Tier 3: Keyword-rule stub ────────────────────────────────────────────
    const aiResults = await categorizeBatchKeywords(supabase, afterTier2);
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
