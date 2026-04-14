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
// Critical ordering:
//   1. delivery BEFORE transporte  ("uber eats" → delivery, not transporte)
//   2. assinaturas BEFORE compras  ("amazon prime" → assinaturas, not compras)
//   3. assinaturas-telecom BEFORE moradia  ("tim pos" → assinaturas, not moradia)
//   4. impostos BEFORE transferencias  ("iof" → impostos, not transferencias)
//   5. transferencias BEFORE moradia  ("pix recarga tim" → transferencias)
//   6. compras BEFORE alimentacao  ("mercado livre" → compras, not "mercado")
//   7. Gaming (xbox/playstation/steam) goes to lazer, not assinaturas
//
// Keep in sync with supabase/functions/categorize-import/index.ts

const KEYWORD_RULES: Array<{ keywords: string[]; category: string }> = [
  {
    // DELIVERY — before transporte (uber eats → delivery, not uber → transporte)
    keywords: [
      'ifood', 'rappi', 'uber eats', 'ubereats', 'james delivery', 'loggi',
      'dominos', 'pizza hut', 'burger king delivery', 'mcdelivery', '99food',
    ],
    category: 'delivery',
  },
  {
    // LAZER gaming override — before assinaturas so "xbox gamepass" → lazer, not "microsoft" → assinaturas
    keywords: [
      'xbox gamepass', 'xbox game pass', 'xbox live',
      'playstation store', 'playstation plus', 'psn ',
    ],
    category: 'lazer',
  },
  {
    // ASSINATURAS streaming/tech — before compras (amazon prime before amazon)
    // smart fit here so it beats the generic "academia " keyword in lazer
    keywords: [
      'netflix', 'spotify', 'amazon prime', 'disney', 'hbo ',
      'paramount', 'globoplay', 'youtube premium', 'youtubepremium', 'youtube music',
      'google one', 'icloud', 'apple.com', 'applecomb', 'microsoft',
      'office 365', 'adobe', 'dropbox', 'mercadopago assin', 'melimais',
      'produtos globo', 'combate', 'deezer', 'crunchyroll', 'duolingo', 'canva',
      'smart fit', 'bodytech', 'bluefit', 'crossfit',
    ],
    category: 'assinaturas',
  },
  {
    // ASSINATURAS telecom pos/pre-pago — before moradia (tim pos before tim residencial)
    keywords: [
      'tim pos', 'claro pos', 'vivo pos', 'oi pos',
      'tim pre', 'claro pre', 'tim controle', 'vivo controle',
      'tim black', 'claro black',
    ],
    category: 'assinaturas',
  },
  {
    // IMPOSTOS — before transporte so "posto " in "imposto renda" doesn't match transporte
    keywords: [
      'ipva', 'iptu', 'irpf', 'imposto', 'darf', 'detran', 'licenciamento',
      'iof ', 'juros de rotativo', 'juros rotativo',
      'encargos', 'multa ', 'sefaz', 'receita federal',
      'das mei', 'taxa boleto', 'boleto bancario',
    ],
    category: 'impostos',
  },
  {
    // TRANSPORTE — after delivery (uber eats already caught) and after impostos ("posto " in "imposto")
    keywords: [
      'uber', '99app', '99 taxi', 'cabify',
      'posto ', 'auto posto', 'combustivel', 'gasolina', 'etanol',
      'shell ', 'ipiranga', 'br petro', 'raizen', 'ale combustivel',
      'sem parar', 'nutag', 'conectcar',
      'estapar', 'estacionamento', 'pedagio',
      'mecanica', 'autopecas', 'auto peca', 'borracharia', 'pneu ',
      'metro ', 'sptrans', 'bilhete unico',
    ],
    category: 'transporte',
  },
  {
    // TRANSFERENCIAS — before moradia (pix recarga tim must not hit moradia)
    keywords: [
      'pix ', 'ted ', 'doc ', 'transferencia',
      'pagamento recebido', 'credito de rotativo', 'estorno',
      'devolucao', 'reembolso', 'saldo em rotativo', 'encerramento de divida',
      'emprestimo',
    ],
    category: 'transferencias',
  },
  {
    // COMPRAS — before alimentacao (mercado livre before generic "mercado ")
    keywords: [
      'mercado livre', 'mercadolivre', 'shopee', 'aliexpress',
      'magalu', 'magazine luiza', 'americanas', 'submarino',
      'casas bahia', 'renner', 'riachuelo', 'marisa', 'havan', 'leader',
      'capinha', 'capas ', 'acessorio', 'king cell', 'eletronico', 'informatica',
      'kalunga', 'leroy merlin', 'amazon', 'kabum', 'ponto frio',
      'zara', 'ca moda',
    ],
    category: 'compras',
  },
  {
    // ALIMENTACAO — after compras so "mercado livre" is already resolved
    // "bar " removed — generic bars are lazer; specific food establishments use restaurante/lanchonete/etc.
    keywords: [
      'supermercado', 'hipermercado', 'mercadinho', 'atacadao', 'atacado',
      'carrefour', 'extra ', 'pao de acucar', 'mundial', 'prezunic',
      'hortifruti', 'hortifrutti', 'sacolao', 'feira ',
      'padaria', 'panificadora', 'confeitaria',
      'acougue', 'peixaria', 'mercearia',
      'acai', 'lanchonete', 'cafeteria', 'cafe ',
      'restaurante', 'boteco', 'churrascaria',
      'hamburgueria', 'sushi', 'pizza ', 'subway', 'mcdonalds', 'burger',
      'mc donalds',
    ],
    category: 'alimentacao',
  },
  {
    keywords: [
      'farmacia', 'drogaria', 'droga ', 'ultrafarma', 'drogasil',
      'pacheco', 'nissei', 'pague menos', 'farma',
      'hospital', 'clinica', 'laboratorio', 'laborat',
      'fleury', 'dasa ', 'odontologia', 'dentista', 'ortodontia',
      'oralplatinum', 'odonto', 'medico', 'consulta', 'exame ',
      'hapvida', 'unimed', 'bradesco saude', 'sulamerica saude', 'amil',
    ],
    category: 'saude',
  },
  {
    // MORADIA — after telecom-assinaturas and transferencias
    keywords: [
      'condominio', 'aluguel',
      'agua ', 'sabesp', 'copasa',
      'luz ', 'energia ', 'enel ', 'cemig ', 'copel ', 'coelba', 'celpe',
      'gas ', 'comgas', 'gas natural',
      'internet ', 'claro residencial', 'vivo residencial',
      'tim residencial', 'oi residencial', 'net combo',
      'telefone fixo', 'vivo ', 'claro ', 'net ', 'oi ', 'tim ', 'fibra',
    ],
    category: 'moradia',
  },
  {
    keywords: [
      'escola ', 'colegio', 'faculdade', 'universidade',
      'educacao ltda', 'educacao s', 'faceb educacao', 'anhanguera', 'kroton',
      'descomplica', 'alura', 'udemy', 'coursera',
      'curso ', 'aula ', 'workshop', 'livraria', 'livro ',
      'material escolar', 'papelaria', 'matricula', 'mensalidade escolar',
      'pearson', 'livros',
    ],
    category: 'educacao',
  },
  {
    // Gaming (steam/xbox/playstation) lives here, not assinaturas
    // smart fit/bodytech/bluefit/crossfit moved to assinaturas (they are subscriptions)
    keywords: [
      'cinema', 'cinemark', 'kinoplex', 'ingresso', 'show ', 'teatro ',
      'parque ', 'museu ', 'academia ',
      'steam', 'playstation', 'xbox', 'nintendo', 'riot games',
      'hotel ', 'pousada', 'hostel', 'airbnb', 'booking', 'decolar',
      'viagem', 'turismo', 'agencia ',
      'bilheteria', 'cervejaria', 'cervejas', 'bar ',
    ],
    category: 'lazer',
  },
  {
    keywords: [
      'salario', 'pagamento salario', 'folha pagamento',
      'pro labore', 'prolabore', 'remuneracao',
      'freelance', 'deposito renda', 'decimo terceiro',
      'bonus',
    ],
    category: 'salario',
  },
  {
    keywords: [
      'xp invest', 'nubank invest', 'rico invest', 'inter invest',
      'tesouro direto', 'tesouro selic', 'cdb ', 'lci ', 'lca ',
      'fundo ', 'acoes ', 'bolsa ', 'rendimento', 'resgate', 'aplicacao',
      'corretora', 'nuinvest',
    ],
    category: 'investimentos',
  },
];

// Categorizes a single description using keyword rules.
// Returns confidence=0 and category='outros' when no rule matches.
// Person name detection (e.g. "NATACHA CALIXTO GARCIA") is handled by
// the Gemini prompt in the Edge Function — not here.
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
