import { createClient } from '@/lib/supabase/server';
import { sanitizeCategory } from '@/lib/utils/categories';

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

  // Verificar que o agendamento pertence ao usuário
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing } = await (supabase as any)
    .from('scheduled_transactions')
    .select('id, status')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!existing) {
    return Response.json({ error: 'Agendamento não encontrado' }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Body inválido' }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const updates: Record<string, unknown> = {};

  if (b.description !== undefined) {
    if (typeof b.description !== 'string' || b.description.trim().length === 0) {
      return Response.json({ error: 'Descrição inválida' }, { status: 400 });
    }
    updates.description = b.description.trim().slice(0, 255);
  }
  if (b.amount !== undefined) {
    if (typeof b.amount !== 'number' || b.amount <= 0) {
      return Response.json({ error: 'Valor inválido' }, { status: 400 });
    }
    updates.amount = b.amount;
  }
  if (b.due_date !== undefined) {
    if (typeof b.due_date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(b.due_date)) {
      return Response.json({ error: 'Data inválida' }, { status: 400 });
    }
    updates.due_date = b.due_date;
  }
  if (b.category !== undefined) {
    updates.category = sanitizeCategory(typeof b.category === 'string' ? b.category : 'outros');
  }
  if (b.status !== undefined) {
    const validStatuses = ['pending', 'overdue', 'canceled'];
    if (!validStatuses.includes(b.status as string)) {
      return Response.json({ error: 'Status inválido' }, { status: 400 });
    }
    updates.status = b.status;
  }
  if (b.notes !== undefined) {
    updates.notes = b.notes ? (b.notes as string).slice(0, 500) : null;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('scheduled_transactions')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) {
    console.error('[scheduled PATCH]', error);
    return Response.json({ error: 'Erro ao atualizar agendamento' }, { status: 500 });
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error, count } = await (supabase as any)
    .from('scheduled_transactions')
    .delete({ count: 'exact' })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    console.error('[scheduled DELETE]', error);
    return Response.json({ error: 'Erro ao excluir agendamento' }, { status: 500 });
  }
  if (!count) {
    return Response.json({ error: 'Agendamento não encontrado' }, { status: 404 });
  }

  return new Response(null, { status: 204 });
}
