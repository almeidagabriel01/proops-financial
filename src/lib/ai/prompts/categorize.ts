// Prompt templates for AI categorization (arch section 5.2)
// Used by categorizeBatch() in categorizer.ts and by the Edge Function

export const CATEGORIZE_SYSTEM = `Voce e um classificador de transacoes financeiras brasileiras.

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

export const CATEGORIZE_USER = (
  transactions: { id: string; description: string; amount: number }[],
) =>
  `Classifique estas transacoes:\n${JSON.stringify(transactions)}\n\nResponda no formato: [{"id": "...", "category": "...", "confidence": 0.95}]`;

export const VALID_CATEGORIES = new Set([
  'alimentacao',
  'delivery',
  'transporte',
  'moradia',
  'saude',
  'educacao',
  'lazer',
  'compras',
  'assinaturas',
  'transferencias',
  'salario',
  'investimentos',
  'impostos',
  'outros',
]);
