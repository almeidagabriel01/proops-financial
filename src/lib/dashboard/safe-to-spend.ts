export interface SafeToSpendInput {
  totalIncome: number;
  totalExpenses: number;
  // Contas pendentes já filtradas pela query (status=pending, due_date <= fim do mês).
  // Não re-filtrar aqui — a query do dashboard é a fonte de verdade.
  pendingBills: Array<{ amount: number; due_date: string }>;
  // Passa o referenceDate derivado do param ?month=YYYY-MM do dashboard
  // para garantir que o cálculo usa o mês correto (não new Date() do servidor em UTC).
  referenceDate?: Date;
}

export interface SafeToSpendResult {
  safeToSpend: number;
  safeToSpendDaily: number;
  balanceMonth: number;
  pendingTotal: number;
  daysRemaining: number;
  pendingBillsCount: number;
}

// Número de dias do referenceDate até o último dia do mês (inclusive hoje = 1 dia restante).
// Usado externamente nos testes também.
export function daysUntilEndOfMonth(ref: Date): number {
  const endOfMonth = new Date(ref.getFullYear(), ref.getMonth() + 1, 0); // último dia, meia-noite
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.ceil((endOfMonth.getTime() - ref.getTime()) / msPerDay) + 1;
}

export function calculateSafeToSpend(input: SafeToSpendInput): SafeToSpendResult {
  const ref = input.referenceDate ?? new Date();
  const daysRemaining = Math.max(1, daysUntilEndOfMonth(ref));

  const pendingTotal = input.pendingBills.reduce((sum, b) => sum + b.amount, 0);
  const balanceMonth = input.totalIncome - input.totalExpenses;
  const safeToSpend = balanceMonth - pendingTotal;
  const safeToSpendDaily = safeToSpend / daysRemaining;

  return {
    safeToSpend,
    safeToSpendDaily,
    balanceMonth,
    pendingTotal,
    daysRemaining,
    pendingBillsCount: input.pendingBills.length,
  };
}
