import { createClient } from '@/lib/supabase/server';
import { sanitizeCategory } from '@/lib/utils/categories';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return Response.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const { id } = await params;

  const { data, error } = await supabase
    .from('recurring_rules')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) {
    console.error('[recurring GET id]', error);
    return Response.json({ error: 'Erro ao buscar recorrente' }, { status: 500 });
  }
  if (!data) {
    return Response.json({ error: 'Recorrente não encontrado' }, { status: 404 });
  }

  return Response.json({ data });
}

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

  const { data: existing } = await supabase
    .from('recurring_rules')
    .select('id')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!existing) {
    return Response.json({ error: 'Recorrente não encontrado' }, { status: 404 });
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
  if (b.category !== undefined) {
    updates.category = sanitizeCategory(typeof b.category === 'string' ? b.category : 'outros');
  }
  if (b.status !== undefined) {
    const validStatuses = ['active', 'paused', 'canceled'];
    if (!validStatuses.includes(b.status as string)) {
      return Response.json({ error: 'Status inválido' }, { status: 400 });
    }
    updates.status = b.status;
  }
  if (b.end_date !== undefined) {
    if (b.end_date === null) {
      updates.end_date = null;
    } else if (typeof b.end_date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(b.end_date)) {
      updates.end_date = b.end_date;
    } else {
      return Response.json({ error: 'Data de fim inválida' }, { status: 400 });
    }
  }

  const { data, error } = await supabase
    .from('recurring_rules')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) {
    console.error('[recurring PATCH]', error);
    return Response.json({ error: 'Erro ao atualizar recorrente' }, { status: 500 });
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

  // Cancelar scheduled_transactions pendentes vinculadas
  await supabase
    .from('scheduled_transactions')
    .update({ status: 'canceled' })
    .eq('recurring_rule_id', id)
    .eq('user_id', user.id)
    .eq('status', 'pending');

  const { error, count } = await supabase
    .from('recurring_rules')
    .delete({ count: 'exact' })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    console.error('[recurring DELETE]', error);
    return Response.json({ error: 'Erro ao excluir recorrente' }, { status: 500 });
  }
  if (!count) {
    return Response.json({ error: 'Recorrente não encontrado' }, { status: 404 });
  }

  return new Response(null, { status: 204 });
}
