// Batch categorization engine — Tier 3 stub (rule-based keyword matching)
//
// The real Tier 3 calls Claude Haiku 4.5 (see docs/ai-integration-roadmap.md).
// This stub replaces the API call with ordered keyword rules so the full
// categorization pipeline works without an API key.
//
// When real AI is enabled: swap `categorizeBatch` to use Anthropic SDK +
// CATEGORIZE_SYSTEM/CATEGORIZE_USER prompts from ./prompts/categorize.ts
//
// Keep keyword rules in sync with supabase/functions/categorize-import/index.ts
// arch sections 5.1, 5.2

import type { SupabaseClient } from '@supabase/supabase-js';

const STUB_CONFIDENCE = 0.8; // Fixed confidence for keyword-matched results
const CHUNK_SIZE = 100;

// Description normalization (mirrors SQL normalize_description() function)
// Used to produce lookup keys consistent with category_cache and category_dictionary
export function normalizeDescription(raw: string): string {
  return raw
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// ─── Keyword rules (ordered — first match wins) ───────────────────────────────
//
// Rules operate on the NORMALIZED description (lowercase, no accents/specials).
// Ordering is intentional:
//   - delivery BEFORE transporte ("uber eats" → delivery, "uber" → transporte)
//   - transferencias BEFORE moradia ("pix recarga tim" → transferencias, not moradia)
//   - "amazon prime" checked inside assinaturas BEFORE "amazon " in compras
//   - iptu ONLY in impostos (not moradia)
//   - Gaming (xbox/playstation/steam) goes to lazer, not assinaturas

const KEYWORD_RULES: Array<{ keywords: string[]; category: string }> = [
  {
    // delivery BEFORE transporte so "uber eats" wins over "uber"
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
    // No generic "mercado" — too ambiguous with Mercado Livre (compras)
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
    // Gaming subscriptions (xbox/playstation/gamepass) go to lazer, not here
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
    // "mercado livre" explicitly here; "amazon prime" already caught in assinaturas
    keywords: [
      'mercado livre', 'shopee', 'aliexpress', 'magalu', 'magazine luiza',
      'americanas', 'renner', 'ca moda', 'zara', 'hm ', 'riachuelo',
      'kabum', 'submarino', 'ponto frio', 'casas bahia',
      'amazon marketplace', 'amazon ',
    ],
    category: 'compras',
  },
  {
    // transferencias BEFORE moradia: "pix recarga tim" must hit here, not moradia
    keywords: ['pix ', 'ted ', 'doc ', 'transferencia', 'emprestimo'],
    category: 'transferencias',
  },
  {
    // iptu NOT here — it goes to impostos only
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
    // Gaming subscriptions live here (not assinaturas)
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
    // iptu ONLY here (not in moradia)
    keywords: [
      'imposto', 'ipva', 'iptu', 'iof', 'darf', 'das ', 'mei ',
      'taxa ', 'tributo', 'receita federal', 'detran', 'sefaz',
    ],
    category: 'impostos',
  },
];

// Categorizes a single description using keyword rules.
// Returns confidence=0 and category='outros' when no rule matches.
export function categorizeByKeywords(description: string): { category: string; confidence: number } {
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

export interface TransactionForCategorization {
  id: string;
  description: string;
  amount: number;
}

export interface CategorizationResult {
  transactionId: string;
  category: string;
  confidence: number;
}

// Categorizes a batch of transactions using keyword rules (Tier 3 stub).
// Saves results to category_cache for future cross-user reuse.
// When real AI is enabled, replace this with a single Claude Haiku batch call.
export async function categorizeBatch(
  supabase: SupabaseClient,
  transactions: TransactionForCategorization[],
): Promise<Map<string, CategorizationResult>> {
  const results = new Map<string, CategorizationResult>();

  if (transactions.length === 0) return results;

  const cacheUpserts: { description_normalized: string; category: string; confidence: number }[] = [];

  for (const t of transactions) {
    const { category, confidence } = categorizeByKeywords(t.description);
    results.set(t.id, { transactionId: t.id, category, confidence });

    // Only cache non-'outros' results to avoid polluting the cache with unknowns
    if (category !== 'outros') {
      cacheUpserts.push({
        description_normalized: normalizeDescription(t.description),
        category,
        confidence,
      });
    }
  }

  // Save to category_cache (fire-and-forget) so Tier 2 hits on future imports
  if (cacheUpserts.length > 0) {
    supabase
      .from('category_cache')
      .upsert(cacheUpserts, { onConflict: 'description_normalized', ignoreDuplicates: false })
      .then(({ error }: { error: unknown }) => {
        if (error) console.error('[categorizer] cache upsert error:', error);
      });
  }

  return results;
}

export interface TransactionUpdate {
  id: string;
  category: string;
  categorySource: 'ai' | 'user' | 'cache';
  categoryConfidence?: number;
}

// Batch-updates transactions with categorization results.
// Processes in chunks of CHUNK_SIZE to avoid Supabase request limits.
export async function saveCategorizations(
  supabase: SupabaseClient,
  updates: TransactionUpdate[],
): Promise<void> {
  if (updates.length === 0) return;

  const chunks: TransactionUpdate[][] = [];
  for (let i = 0; i < updates.length; i += CHUNK_SIZE) {
    chunks.push(updates.slice(i, i + CHUNK_SIZE));
  }

  await Promise.all(
    chunks.map(async (chunk) => {
      await Promise.all(
        chunk.map(async (u) => {
          const { error } = await supabase
            .from('transactions')
            .update({
              category: u.category,
              category_source: u.categorySource,
              category_confidence: u.categoryConfidence ?? null,
            })
            .eq('id', u.id);

          if (error) {
            console.error('[categorizer] saveCategorizations update error for tx', u.id, error);
          }
        }),
      );
    }),
  );
}
