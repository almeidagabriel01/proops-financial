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
  const updates: Record<string, unknown> = {};

  if (b.name !== undefined) {
    if (typeof b.name !== 'string' || (b.name as string).trim().length === 0) {
      return Response.json({ error: 'Nome inválido' }, { status: 400 });
    }
    updates.name = (b.name as string).trim().slice(0, 100);
  }
  if (b.target_amount !== undefined) {
    if (typeof b.target_amount !== 'number' || b.target_amount <= 0) {
      return Response.json({ error: 'Valor alvo inválido' }, { status: 400 });
    }
    updates.target_amount = b.target_amount;
  }
  if (b.current_amount !== undefined) {
    if (typeof b.current_amount !== 'number' || b.current_amount < 0) {
      return Response.json({ error: 'Valor atual inválido' }, { status: 400 });
    }
    updates.current_amount = b.current_amount;
  }
  if (b.deadline !== undefined) {
    if (typeof b.deadline !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(b.deadline)) {
      return Response.json({ error: 'Prazo inválido' }, { status: 400 });
    }
    updates.deadline = b.deadline;
  }
  if (b.status !== undefined) {
    if (!['active', 'completed', 'canceled'].includes(b.status as string)) {
      return Response.json({ error: 'Status inválido' }, { status: 400 });
    }
    updates.status = b.status;
  }

  const { data, error } = await supabase
    .from('goals')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) {
    console.error('[goals PATCH]', error);
    return Response.json({ error: 'Erro ao atualizar objetivo' }, { status: 500 });
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
    .from('goals')
    .delete({ count: 'exact' })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    console.error('[goals DELETE]', error);
    return Response.json({ error: 'Erro ao excluir objetivo' }, { status: 500 });
  }
  if (!count) {
    return Response.json({ error: 'Objetivo não encontrado' }, { status: 404 });
  }

  return new Response(null, { status: 204 });
}
