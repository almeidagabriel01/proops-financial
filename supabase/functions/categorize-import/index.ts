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
  type: string;
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

// Ordering mirrors src/lib/ai/categorizer.ts — keep in sync.
const KEYWORD_RULES: Array<{ keywords: string[]; category: string }> = [
  {
    // DELIVERY — before transporte
    keywords: [
      'ifood', 'rappi', 'uber eats', 'ubereats', 'james delivery', 'loggi',
      'dominos', 'pizza hut', 'burger king delivery', 'mcdelivery',
    ],
    category: 'delivery',
  },
  {
    // ASSINATURAS streaming/tech — before compras (amazon prime before amazon)
    keywords: [
      'netflix', 'spotify', 'amazon prime', 'disney', 'hbo ',
      'paramount', 'globoplay', 'youtube premium', 'youtubepremium', 'youtube music',
      'google one', 'icloud', 'apple.com', 'applecomb', 'microsoft',
      'office 365', 'adobe', 'dropbox', 'mercadopago assin', 'melimais',
      'produtos globo', 'combate', 'deezer', 'crunchyroll', 'duolingo', 'canva',
    ],
    category: 'assinaturas',
  },
  {
    // ASSINATURAS telecom pos/pre-pago — before moradia
    keywords: [
      'tim pos', 'claro pos', 'vivo pos', 'oi pos',
      'tim pre', 'claro pre', 'tim controle', 'vivo controle',
      'tim black', 'claro black',
    ],
    category: 'assinaturas',
  },
  {
    // TRANSPORTE — after delivery
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
    // IMPOSTOS — before transferencias
    keywords: [
      'ipva', 'iptu', 'irpf', 'imposto', 'darf', 'detran', 'licenciamento',
      'iof ', 'juros de rotativo', 'juros rotativo',
      'encargos', 'multa ', 'sefaz', 'receita federal',
    ],
    category: 'impostos',
  },
  {
    // TRANSFERENCIAS — before moradia
    keywords: [
      'pix ', 'ted ', 'doc ', 'transferencia',
      'pagamento recebido', 'credito de rotativo', 'estorno',
      'devolucao', 'reembolso', 'saldo em rotativo', 'encerramento de divida',
    ],
    category: 'transferencias',
  },
  {
    // COMPRAS — before alimentacao (mercado livre before generic "mercado")
    keywords: [
      'mercado livre', 'mercadolivre', 'shopee', 'aliexpress',
      'magalu', 'magazine luiza', 'americanas', 'submarino',
      'casas bahia', 'renner', 'riachuelo', 'marisa', 'havan', 'leader',
      'capinha', 'capas ', 'acessorio', 'king cell', 'eletronico', 'informatica',
      'kalunga', 'leroy merlin', 'amazon', 'kabum', 'ponto frio',
    ],
    category: 'compras',
  },
  {
    // ALIMENTACAO — after compras
    keywords: [
      'supermercado', 'hipermercado', 'mercadinho', 'atacadao', 'atacado',
      'carrefour', 'extra ', 'pao de acucar', 'mundial', 'prezunic',
      'hortifruti', 'hortifrutti', 'sacolao', 'feira ',
      'padaria', 'panificadora', 'confeitaria',
      'acougue', 'peixaria', 'mercearia',
      'acai', 'lanchonete', 'cafeteria', 'cafe ',
      'restaurante', 'bar ', 'boteco', 'churrascaria',
      'hamburgueria', 'sushi', 'pizza ', 'subway', 'mcdonalds', 'burger',
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
    ],
    category: 'educacao',
  },
  {
    // Gaming (steam/xbox/playstation) lives here, not assinaturas
    keywords: [
      'cinema', 'cinemark', 'kinoplex', 'ingresso', 'show ', 'teatro ',
      'parque ', 'museu ', 'academia ', 'smart fit', 'bodytech', 'bluefit', 'crossfit',
      'steam', 'playstation', 'xbox', 'nintendo', 'riot games',
      'hotel ', 'pousada', 'hostel', 'airbnb', 'booking', 'decolar',
      'viagem', 'turismo', 'agencia ',
    ],
    category: 'lazer',
  },
  {
    keywords: [
      'salario', 'pagamento salario', 'folha pagamento',
      'pro labore', 'prolabore', 'remuneracao',
      'freelance', 'deposito renda', 'decimo terceiro',
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

// Heuristic: person names (e.g. "NATACHA CALIXTO GARCIA") → transferencias
function looksLikePersonName(normalized: string): boolean {
  const words = normalized.split(' ').filter((w) => w.length > 0);
  if (words.length < 2 || words.length > 5) return false;
  if (/\d/.test(normalized)) return false;
  const businessWords = [
    'ltda', 'eireli', 'comercio', 'servicos', 'industria', 'distribuidora',
    'restaurante', 'loja', 'mercado', 'farmacia', 'supermercado',
    'posto', 'auto', 'moto', 'peca', 'hotel', 'bar', 'cafe',
  ];
  if (businessWords.some((w) => normalized.includes(w))) return false;
  return words.every((w) => /^[a-z]{2,}$/.test(w));
}

function categorizeByKeywords(description: string): { category: string; confidence: number } {
  const normalized = normalizeDescription(description);
  for (const rule of KEYWORD_RULES) {
    for (const keyword of rule.keywords) {
      if (normalized.includes(keyword)) {
        return { category: rule.category, confidence: STUB_CONFIDENCE };
      }
    }
  }
  // Fallback heuristic: person names → transferencias
  if (looksLikePersonName(normalized)) {
    return { category: 'transferencias', confidence: 0.6 };
  }
  return { category: 'outros', confidence: 0 };
}

// ─── Tier 0: Explicit user rules (table: categorization_rules) ────────────────

async function lookupCategorizationRules(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  userId: string,
  transactions: PendingTransaction[],
): Promise<Map<string, { category: string; source: 'rule' }>> {
  const results = new Map<string, { category: string; source: 'rule' }>();
  if (transactions.length === 0) return results;

  const { data, error } = await supabase
    .from('categorization_rules')
    .select('pattern, match_type, category')
    .eq('user_id', userId)
    .eq('active', true)
    .order('priority', { ascending: false });

  if (error) {
    console.error('[categorize-import] Tier 0 lookup error:', error);
    return results;
  }

  const rules: Array<{ pattern: string; match_type: string; category: string }> = data ?? [];
  if (rules.length === 0) return results;

  for (const tx of transactions) {
    const normalized = normalizeDescription(tx.description);
    for (const rule of rules) {
      const pat = normalizeDescription(rule.pattern);
      let matched = false;
      if (rule.match_type === 'exact') {
        matched = normalized === pat;
      } else if (rule.match_type === 'starts_with') {
        matched = normalized.startsWith(pat);
      } else {
        // contains (default)
        matched = normalized.includes(pat);
      }
      if (matched) {
        results.set(tx.id, { category: rule.category, source: 'rule' });
        break; // first match wins (priority DESC already applied)
      }
    }
  }

  return results;
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

// ─── Valid categories set (for response validation) ───────────────────────────

const VALID_CATEGORIES = new Set([
  'alimentacao', 'delivery', 'transporte', 'moradia', 'saude', 'educacao',
  'lazer', 'compras', 'assinaturas', 'transferencias', 'salario',
  'investimentos', 'impostos', 'outros',
]);

// ─── Tier 3: Gemini AI categorization (with keyword fallback) ─────────────────
// Calls Google Gemini 2.0 Flash when GOOGLE_AI_API_KEY is set.
// Falls back to keyword rules if key is missing or call fails.
// Saves results to category_cache for Tier 2 reuse.

const CATEGORIZE_SYSTEM = `Voce e um classificador especialista em transacoes financeiras brasileiras de cartao de credito e conta corrente.

CATEGORIAS (use exatamente esses valores):
- alimentacao: supermercados, padarias, acougues, hortifruti, mercearias, lojas de alimentos
- delivery: iFood, Rappi, Uber Eats, James, restaurantes com pedido online, pizza delivery
- transporte: Uber, 99, Cabify, onibus, metro, combustivel, estacionamento, pedagio, Sem Parar, automovel
- moradia: aluguel, condominio, IPTU, agua, luz, gas, internet residencial, telefone fixo
- saude: farmacia, drogaria, medico, hospital, clinica, plano de saude, dentista, laboratorio, exame
- educacao: escola, faculdade, curso, livro didatico, material escolar, matricula, mensalidade escolar
- lazer: cinema, teatro, show, parque, academia, clube, jogos, streaming de games, hobby, viagem, hotel, turismo
- compras: lojas em geral, roupas, calcados, eletronicos, moveis, presentes, acessorios, capinhas, produtos nao alimenticios
- assinaturas: Netflix, Spotify, Amazon Prime, Disney+, HBO, Apple, Google, Microsoft, planos mensais recorrentes
- transferencias: PIX, TED, DOC, transferencia bancaria, pagamento entre pessoas
- salario: salario, pagamento de empregador, pro-labore, freelance recebido, renda
- investimentos: corretora, acoes, fundos, CDB, tesouro direto, cripto, aporte
- impostos: IPVA, IR, imposto de renda, DARF, FGTS, INSS, tributos governamentais
- outros: quando nenhuma categoria acima se aplica claramente

REGRAS CRITICAS:
1. Produtos fisicos (roupas, eletronicos, acessorios, capinhas, utensilios) = compras (NUNCA impostos)
2. iFood/Rappi/Uber Eats = delivery (NUNCA alimentacao)
3. Supermercado/Mercado/Atacado = alimentacao (NUNCA delivery)
4. Uber/99/taxi = transporte (NUNCA delivery)
5. Netflix/Spotify/Amazon/Apple/Google = assinaturas (NUNCA lazer)
6. PIX recebido sem identificar origem = transferencias
7. Salario/pagamento de empresa = salario
8. Farmacia/Drogaria = saude (mesmo que venda outros produtos)
9. IPVA/IPTU/IR/DARF = impostos (NAO confundir com compras de automovel)
10. Na duvida entre duas categorias, escolha a mais especifica
11. Nomes com * (asterisco) indicam marketplace/app: MERCADOLIVRE* = compras, GOOGLE* = assinaturas (exceto Google Pay = transferencias), APPLE* ou APPLECOMB* = assinaturas, UBER* = transporte, IFOOD* = delivery
12. Farmacia/Farma/Drogaria/Droga no nome = saude (mesmo filial ou nome proprio)
13. Celular/Cell/Phone/Eletronicos no nome = compras
14. Odontologia/Dentista/Clinica/Medico/Doutor = saude
15. Educacao/Escola/Faculdade/Colegio/Curso/Ltda Educ = educacao
16. Tag/Pedagio/Sem Parar/Nutag/ConectCar = transporte
17. Tim/Claro/Vivo/Oi/Net seguidos de Pos/Pre/Plano = assinaturas; residencial sem sufixo = moradia
18. Cafe/Cafeteria/Acai/Lanchonete/Restaurante/Bar = alimentacao
19. Parcelas de lojas fisicas (Renner, Riachuelo, C&A, Marisa, Leader, Havan) = compras
20. Juros/IOF/Rotativo/Encargos/Multa bancaria = impostos
21. Credito de rotativo/Estorno/Pagamento recebido = transferencias
22. Produtos + nome de empresa sem contexto = assinaturas se valor fixo mensal, compras se variavel
23. Capas/Capinha/Acessorio/Capa para = compras
24. Auto Peca/Autopecas/Mecanica/Oficina = transporte
25. Nome de pessoa fisica (CPF, SWE) = transferencias

EXEMPLOS DE CLASSIFICACAO:
alimentacao: "SUPERMERCADO PAO DE ACUCAR", "MERCADINHO SILVA", "PADARIA CENTRAL", "ATACADAO", "HORTIFRUTI", "CASA DO ACAI", "ACAI CAFE", "LANCHONETE", "CAFETERIA"
delivery: "IFOOD*RESTAURANTE", "RAPPI", "UBER EATS", "DOMINOS PIZZA", "JAMES DELIVERY"
transporte: "UBER*VIAGEM", "99APP", "SHELL COMBUSTIVEL", "POSTO IPIRANGA", "ESTAPAR ESTACIONAMENTO", "SEM PARAR", "NUTAG*", "NUTAG PZI", "CONECTCAR", "AUTO POSTO", "JRA AUTOPECAS MECANI"
moradia: "CONDOMINIO RESIDENCIAL", "COPEL ENERGIA", "SABESP AGUA", "NET CLARO INTERNET", "ALUGUEL"
saude: "DROGARIA SAO PAULO", "ULTRAFARMA", "DROGA RAIA", "LABORATORIO FLEURY", "HAPVIDA SAUDE", "NATUS FARMA FILIAL", "FARMACIA POPULAR", "DROGASIL", "ORALPLATINUM", "ANDREA ODONTOLOGIA", "CLINICA MEDICA"
educacao: "FACULDADE ANHANGUERA", "CURSO ALURA", "LIVRARIA CULTURA", "MATERIAL ESCOLAR", "FACEB EDUCACAO LTDA", "EDUCACAO LTDA", "ESCOLA", "COLEGIO"
lazer: "CINEMARK", "STEAM GAMES", "ACADEMIA SMART FIT", "HOTEL MARRIOTT", "AIRBNB"
compras: "AMAZON*COMPRA", "MERCADO LIVRE", "MAGALU", "RENNER LOJAS", "SHOPEE", "CAPINHA CELULAR", "ACESSORIOS", "MERCADOLIVRE*", "KING CELL MACHADO", "PARAISO DAS CAPAS", "JRA AUTOPECAS", "SHOPEE*", "AMERICANAS"
assinaturas: "NETFLIX.COM", "SPOTIFY", "AMAZON PRIME", "APPLE.COM/BILL", "GOOGLE*GSUITE", "MICROSOFT 365", "APPLECOMBILL", "APPLE.COM BILL", "GOOGLE YOUTUBEPREMIUM", "GOOGLE ONE", "MP *MELIMAIS", "MERCADOPAGO ASSINATURA", "PRODUTOS GLOBO", "TIM POS", "CLARO PRE", "NET COMBO", "AMAZON.COM"
transferencias: "PIX ENVIADO", "TED PARA JOAO", "TRANSFERENCIA DOC", "PAGAMENTO RECEBIDO", "CREDITO DE ROTATIVO", "ESTORNO DE JUROS", "SALDO EM ROTATIVO", "DORISLAYNE NERY", "NATACHA CALIXTO", "CONRADO SOUZA DIAS"
salario: "PAGAMENTO SALARIO", "FOLHA PAGAMENTO", "PRO-LABORE"
investimentos: "XP INVESTIMENTOS", "NUBANK INVESTIMENTO", "TESOURO DIRETO"
impostos: "IPVA 2026", "DARF IRPF", "DETRAN LICENCIAMENTO", "IOF DE ROTATIVO", "JUROS DE ROTATIVO", "ENCERRAMENTO DE DIVIDA", "IPVA*"

Responda APENAS com JSON valido. Sem explicacao, sem markdown, sem comentarios.`;

async function categorizeBatchGemini(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  transactions: PendingTransaction[],
): Promise<Map<string, { category: string; confidence: number }>> {
  const results = new Map<string, { category: string; confidence: number }>();
  if (transactions.length === 0) return results;

  const apiKey = Deno.env.get('GOOGLE_AI_API_KEY');

  // No API key → fall through to keyword rules
  if (!apiKey) {
    console.log('[categorize-import] GOOGLE_AI_API_KEY not set, using keyword rules');
    return categorizeBatchKeywords(supabase, transactions);
  }

  try {
    const userMessage = `Classifique estas transacoes bancarias brasileiras.
Responda APENAS com JSON no formato:
[{"id":"uuid","category":"categoria","confidence":0.95}]

TRANSACOES:
${JSON.stringify(
  transactions.map((t) => ({
    id: t.id,
    description: t.description,
    amount: t.amount,
    type: t.type,
  })),
)}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: CATEGORIZE_SYSTEM }] },
          contents: [{ role: 'user', parts: [{ text: userMessage }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            maxOutputTokens: 4096,
            temperature: 0.1,
          },
        }),
      },
    );

    if (!response.ok) {
      console.error('[categorize-import] Gemini API error:', response.status, await response.text());
      return categorizeBatchKeywords(supabase, transactions);
    }

    const data = await response.json();
    const content = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!content) {
      console.error('[categorize-import] Gemini empty response, falling back');
      return categorizeBatchKeywords(supabase, transactions);
    }

    // deno-lint-ignore no-explicit-any
    const parsed: { id: string; category: string; confidence: number }[] = JSON.parse(content) as any[];

    const cacheUpserts: { description_normalized: string; category: string; confidence: number }[] = [];

    for (const item of parsed) {
      const tx = transactions.find((t) => t.id === item.id);
      if (!tx) continue;

      const category = VALID_CATEGORIES.has(item.category) ? item.category : 'outros';
      const confidence = typeof item.confidence === 'number' ? item.confidence : 0.8;

      results.set(item.id, { category, confidence });

      if (category !== 'outros') {
        cacheUpserts.push({ description_normalized: normalizeDescription(tx.description), category, confidence });
      }
    }

    // Any transaction missing from Gemini response → keyword fallback
    const missing = transactions.filter((t) => !results.has(t.id));
    if (missing.length > 0) {
      for (const t of missing) {
        const { category, confidence } = categorizeByKeywords(t.description);
        results.set(t.id, { category, confidence });
        if (category !== 'outros') {
          cacheUpserts.push({ description_normalized: normalizeDescription(t.description), category, confidence });
        }
      }
    }

    // Save to cache (fire-and-forget)
    if (cacheUpserts.length > 0) {
      supabase
        .from('category_cache')
        .upsert(cacheUpserts, { onConflict: 'description_normalized', ignoreDuplicates: false })
        .then(({ error }: { error: unknown }) => {
          if (error) console.error('[categorize-import] cache upsert error:', error);
        });
    }

    return results;
  } catch (err) {
    console.error('[categorize-import] Gemini call failed, falling back to keywords:', err);
    return categorizeBatchKeywords(supabase, transactions);
  }
}

// ─── Keyword-only fallback (no cache write — called only when Gemini fails) ───

function categorizeBatchKeywords(
  // deno-lint-ignore no-explicit-any
  _supabase: any,
  transactions: PendingTransaction[],
): Map<string, { category: string; confidence: number }> {
  const results = new Map<string, { category: string; confidence: number }>();
  for (const t of transactions) {
    results.set(t.id, categorizeByKeywords(t.description));
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
    category_source: 'ai' | 'user' | 'cache' | 'rule';
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
      .select('id, description, amount, type')
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

    // ── Tier 0: Explicit user rules ──────────────────────────────────────────
    const ruleHits = await lookupCategorizationRules(supabase, userId, pending);
    const afterTier0 = pending.filter((t) => !ruleHits.has(t.id));
    console.log('[categorize-import] Tier 0 hits:', ruleHits.size, 'remaining:', afterTier0.length);

    // ── Tier 1: User dictionary ──────────────────────────────────────────────
    const userHits = await lookupUserDictionary(supabase, userId, afterTier0);
    const afterTier1 = afterTier0.filter((t) => !userHits.has(t.id));
    console.log('[categorize-import] Tier 1 hits:', userHits.size, 'remaining:', afterTier1.length);

    // ── Tier 2: Global cache ─────────────────────────────────────────────────
    const cacheHits = await lookupGlobalCache(supabase, afterTier1);
    const afterTier2 = afterTier1.filter((t) => !cacheHits.has(t.id));
    console.log('[categorize-import] Tier 2 hits:', cacheHits.size, 'remaining:', afterTier2.length);

    // ── Tier 3: Gemini AI (com fallback para keyword rules) ─────────────────
    const aiResults = await categorizeBatchGemini(supabase, afterTier2);
    console.log('[categorize-import] Tier 3 categorized:', aiResults.size);

    // ── Build and save all updates ───────────────────────────────────────────
    const updates: Array<{
      id: string;
      category: string;
      category_source: 'ai' | 'user' | 'cache' | 'rule';
      category_confidence: number | null;
    }> = [];

    for (const [id, hit] of ruleHits) {
      updates.push({ id, category: hit.category, category_source: 'rule', category_confidence: 1.0 });
    }
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
