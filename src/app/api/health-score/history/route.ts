import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return Response.json({ error: 'Não autorizado' }, { status: 401 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('health_score_history')
    .select('month, score')
    .eq('user_id', user.id)
    .order('month', { ascending: false })
    .limit(6);

  if (error) {
    console.error('[health-score/history GET]', error);
    return Response.json({ error: 'Erro ao buscar histórico' }, { status: 500 });
  }

  const history = (data ?? [])
    .reverse()
    .map((row: { month: string; score: number }) => ({
      month: row.month.slice(0, 7), // "2026-04-01" → "2026-04"
      score: row.score,
    }));

  return Response.json({ data: history });
}
