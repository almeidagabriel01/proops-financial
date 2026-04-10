// Mirrors SQL normalize_description() and src/lib/ai/categorizer.ts
// Used client-side for category_dictionary lookups (same normalization, same key)
export function normalizeDescription(raw: string): string {
  return raw
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(amount);
}

export function formatDate(date: string): string {
  return new Intl.DateTimeFormat('pt-BR').format(new Date(date + 'T12:00:00'));
}

export function formatDateShort(date: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
  })
    .format(new Date(date + 'T12:00:00'))
    .replace('.', '');
}

export function formatDateRelative(date: string): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const txDate = new Date(date + 'T12:00:00');
  txDate.setHours(0, 0, 0, 0);
  const diffDays = Math.round((today.getTime() - txDate.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'hoje';
  if (diffDays === 1) return 'ontem';
  return formatDateShort(date);
}

export function getMonthBounds(date: Date = new Date()): { start: string; end: string } {
  const y = date.getFullYear();
  const m = date.getMonth();
  const start = new Date(y, m, 1);
  const end = new Date(y, m + 1, 0);
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  };
}

/** Retorna YYYY-MM do mês atual */
export function currentYM(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/** Formata string de dígitos como moeda BR (ex: "150000" → "1.500,00") */
export function maskCurrency(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  const num = parseInt(digits, 10);
  return (num / 100).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Inicializa máscara a partir de um valor numérico */
export function initCurrencyMask(amount?: number | null): string {
  if (!amount || amount <= 0) return '';
  return maskCurrency(String(Math.round(amount * 100)));
}

/** Parse da string mascarada para número (ex: "1.500,00" → 1500) */
export function parseCurrencyMask(masked: string): number {
  if (!masked) return 0;
  return parseFloat(masked.replace(/\./g, '').replace(',', '.')) || 0;
}

export function getPrevMonthBounds(): { start: string; end: string } {
  const now = new Date();
  return getMonthBounds(new Date(now.getFullYear(), now.getMonth() - 1, 1));
}

export interface WeekData {
  week: string;
  receitas: number;
  despesas: number;
}

export function groupByWeek(
  transactions: Array<{ date: string; amount: number; type: 'credit' | 'debit' }>,
): WeekData[] {
  const weeks: Record<string, WeekData> = {};
  for (const tx of transactions) {
    const day = parseInt(tx.date.split('-')[2], 10);
    const key = `Sem ${Math.ceil(day / 7)}`;
    if (!weeks[key]) weeks[key] = { week: key, receitas: 0, despesas: 0 };
    if (tx.type === 'credit') weeks[key].receitas += tx.amount;
    else weeks[key].despesas += Math.abs(tx.amount);
  }
  return Object.values(weeks).sort((a, b) => a.week.localeCompare(b.week));
}
