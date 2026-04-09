import { createClient } from '@/lib/supabase/server';
import { detectRecurring } from '@/lib/recurring/detector';

/**
 * POST /api/recurring/detect
 * Analyzes the user's transaction history and returns recurring pattern candidates.
 * Does NOT save anything — the client decides which candidates to confirm.
 *
 * Body (optional): { monthsBack?: number }  — default 6, max 12
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return Response.json({ error: 'Não autorizado' }, { status: 401 });
  }

  let monthsBack = 6;
  try {
    const body = await request.json() as Record<string, unknown>;
    if (typeof body.monthsBack === 'number') {
      monthsBack = Math.min(12, Math.max(2, Math.floor(body.monthsBack)));
    }
  } catch {
    // body is optional — continue with default
  }

  const since = new Date();
  since.setMonth(since.getMonth() - monthsBack);
  const sinceStr = since.toISOString().slice(0, 10);

  const { data: transactions, error } = await supabase
    .from('transactions')
    .select('date, description, amount, type, category')
    .eq('user_id', user.id)
    .gte('date', sinceStr)
    .order('date', { ascending: true });

  if (error) {
    console.error('[recurring detect]', error);
    return Response.json({ error: 'Erro ao buscar transações' }, { status: 500 });
  }

  const candidates = detectRecurring(
    (transactions ?? []).map((t) => ({
      date: t.date as string,
      description: t.description as string,
      amount: Math.abs(t.amount as number),
      type: t.type as 'credit' | 'debit',
      category: t.category as string,
    })),
  );

  return Response.json({ data: candidates, count: candidates.length });
}
