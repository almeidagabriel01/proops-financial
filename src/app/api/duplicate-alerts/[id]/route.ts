import { createClient } from '@/lib/supabase/server';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return Response.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const { id } = await params;

  let body: { status?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Requisição inválida' }, { status: 400 });
  }

  if (body.status !== 'dismissed') {
    return Response.json({ error: 'Status inválido' }, { status: 400 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error, count } = await (supabase as any)
    .from('duplicate_alerts')
    .update({ status: 'dismissed' }, { count: 'exact' })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    console.error('[duplicate-alerts/[id]] PATCH error:', error);
    return Response.json({ error: 'Erro ao atualizar alerta' }, { status: 500 });
  }

  if (!count || count === 0) {
    return Response.json({ error: 'Alerta não encontrado' }, { status: 404 });
  }

  return Response.json({ success: true });
}
