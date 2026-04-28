import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return Response.json({ error: 'Não autorizado' }, { status: 401 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('duplicate_alerts')
    .select(
      `id, status, created_at,
       t1:transaction_id_1(id, date, description, amount),
       t2:transaction_id_2(id, date, description, amount)`,
    )
    .eq('user_id', user.id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('[duplicate-alerts] GET error:', error);
    return Response.json({ error: 'Erro ao buscar alertas' }, { status: 500 });
  }

  return Response.json({ alerts: data ?? [] });
}
