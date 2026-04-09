import { createClient } from '@/lib/supabase/server';
import { projectCashFlow, collapseToWeekly } from '@/lib/cashflow/projector';
import { getEffectiveTier } from '@/lib/billing/plans';

/**
 * GET /api/cashflow
 * Returns a projected cash flow series based on pending scheduled transactions.
 *
 * Query params:
 *   from    YYYY-MM-DD  start date (default: today)
 *   months  number      months ahead to project (default: 3, max depends on plan)
 *   weekly  boolean     collapse daily points to weekly (default: false)
 */
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return Response.json({ error: 'Não autorizado' }, { status: 401 });
  }

  // Plan check — Basic gets 1 month, Pro gets 12 months ahead
  const { data: profile } = await supabase
    .from('profiles')
    .select('plan, trial_ends_at')
    .eq('id', user.id)
    .single();

  const tier = getEffectiveTier(
    (profile?.plan as 'basic' | 'pro' | null) ?? 'basic',
    profile?.trial_ends_at as string | null,
  );

  const maxMonths = tier === 'pro' ? 12 : 1;

  const url = new URL(request.url);
  const today = new Date().toISOString().slice(0, 10);
  const from = url.searchParams.get('from') ?? today;
  const requestedMonths = parseInt(url.searchParams.get('months') ?? '3', 10);
  const months = Math.min(maxMonths, Math.max(1, requestedMonths));
  const useWeekly = url.searchParams.get('weekly') === 'true';

  const toDate = new Date(from + 'T12:00:00Z');
  toDate.setMonth(toDate.getMonth() + months);
  const to = toDate.toISOString().slice(0, 10);

  // Fetch pending scheduled transactions in range
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: scheduled, error: schedError } = await (supabase as any)
    .from('scheduled_transactions')
    .select('due_date, amount, type, status')
    .eq('user_id', user.id)
    .gte('due_date', from)
    .lte('due_date', to)
    .in('status', ['pending', 'overdue']);

  if (schedError) {
    console.error('[cashflow GET]', schedError);
    return Response.json({ error: 'Erro ao buscar agendamentos' }, { status: 500 });
  }

  // Approximate current balance: sum of all settled transactions
  const { data: balanceRows } = await supabase
    .from('transactions')
    .select('amount')
    .eq('user_id', user.id);

  const currentBalance = (balanceRows ?? []).reduce(
    (s: number, t: { amount: number }) => s + (t.amount as number),
    0,
  );

  let projection = projectCashFlow({
    currentBalance,
    scheduledItems: (scheduled ?? []) as Array<{
      due_date: string;
      amount: number;
      type: 'credit' | 'debit';
      status: 'pending' | 'paid' | 'overdue' | 'canceled';
    }>,
    startDate: from,
    endDate: to,
  });

  if (useWeekly) {
    projection = collapseToWeekly(projection);
  }

  return Response.json({
    data: projection,
    currentBalance: Math.round(currentBalance * 100) / 100,
    from,
    to,
    months,
    planLimit: maxMonths,
  });
}
