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

export function getPrevMonthBounds(): { start: string; end: string } {
  const now = new Date();
  return getMonthBounds(new Date(now.getFullYear(), now.getMonth() - 1, 1));
}
