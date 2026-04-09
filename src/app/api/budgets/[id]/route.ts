import { createClient } from '@/lib/supabase/server';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return Response.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Body inválido' }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  if (typeof b.monthly_limit !== 'number' || b.monthly_limit <= 0) {
    return Response.json({ error: 'Limite mensal inválido' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('budgets')
    .update({ monthly_limit: b.monthly_limit as number })
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) {
    console.error('[budgets PATCH]', error);
    return Response.json({ error: 'Erro ao atualizar orçamento' }, { status: 500 });
  }

  return Response.json({ data });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return Response.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const { id } = await params;

  const { error, count } = await supabase
    .from('budgets')
    .delete({ count: 'exact' })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    console.error('[budgets DELETE]', error);
    return Response.json({ error: 'Erro ao excluir orçamento' }, { status: 500 });
  }
  if (!count) {
    return Response.json({ error: 'Orçamento não encontrado' }, { status: 404 });
  }

  return new Response(null, { status: 204 });
}
