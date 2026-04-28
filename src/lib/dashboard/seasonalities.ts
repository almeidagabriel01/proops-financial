import type { SupabaseClient } from '@supabase/supabase-js';

export interface SeasonalityInfo {
  label: string;
  keywords: string[];
  icon: string;
  months: number[];
}

// ⚠️  Black Friday: usar 'black friday' e 'blackfriday' (strings completas).
// Não adicionar 'black' sozinho — produz falsos positivos em nomes como
// "Black Bear Restaurant", produtos da linha Black, etc.
export const BRAZIL_SEASONALITIES: SeasonalityInfo[] = [
  {
    label: 'IPVA e licenciamento do veículo',
    keywords: ['ipva', 'licenciamento', 'veículo', 'crlv', 'detran'],
    icon: 'Car',
    months: [1],
  },
  {
    label: 'IPTU e material escolar',
    keywords: ['iptu', 'material escolar', 'matrícula', 'uniforme', 'mochila'],
    icon: 'School',
    months: [2],
  },
  {
    label: 'Declaração do Imposto de Renda',
    keywords: ['irpf', 'imposto de renda', 'receita federal', ' ir '],
    icon: 'FileText',
    months: [3, 4],
  },
  {
    label: 'Temporada de férias e viagens',
    keywords: ['viagem', 'passagem', 'hotel', 'hospedagem', 'férias', 'airbnb'],
    icon: 'Plane',
    months: [6, 7],
  },
  {
    label: 'Black Friday',
    keywords: ['black friday', 'blackfriday'],
    icon: 'ShoppingBag',
    months: [11],
  },
  {
    label: 'Gastos de fim de ano',
    keywords: ['natal', 'presente', 'confraternização', 'amigo secreto', 'ceia'],
    icon: 'Gift',
    months: [12],
  },
];

export function getActiveSeasonalities(month: number): SeasonalityInfo[] {
  return BRAZIL_SEASONALITIES.filter((s) => s.months.includes(month));
}

// Busca transações do usuário no referenceYear para os meses e keywords indicados.
// Filtragem de mês e keyword feita client-side para evitar SQL complexo com OR de ilike.
// Para o MVP, o volume de transações por ano é suficientemente baixo.
// referenceYear vem de targetDate.getFullYear() - 1 (ano do período visualizado no dashboard).
export async function getSeasonalityEstimate(
  supabase: SupabaseClient,
  userId: string,
  months: number[],
  keywords: string[],
  referenceYear: number,
): Promise<{ total: number; transactionCount: number } | null> {
  const { data } = await supabase
    .from('transactions')
    .select('amount, description, date')
    .eq('user_id', userId)
    .eq('type', 'debit')
    .gte('date', `${referenceYear}-01-01`)
    .lte('date', `${referenceYear}-12-31`);

  const matching = (data ?? []).filter((t: { amount: number; description: string; date: string }) => {
    // UTC date math para evitar ambiguidade de fuso horário
    const txMonth = new Date(t.date + 'T12:00:00Z').getUTCMonth() + 1;
    if (!months.includes(txMonth)) return false;
    const desc = t.description.toLowerCase();
    return keywords.some((kw) => desc.includes(kw.toLowerCase()));
  });

  if (matching.length === 0) return null;

  return {
    total: matching.reduce((sum: number, t: { amount: number }) => sum + Math.abs(t.amount), 0),
    transactionCount: matching.length,
  };
}
