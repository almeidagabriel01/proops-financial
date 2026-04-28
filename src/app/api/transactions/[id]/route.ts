import { createClient } from '@/lib/supabase/server';
import { sanitizeCategory } from '@/lib/utils/categories';

interface UpdateTransactionBody {
  date?: string;
  description?: string;
  amount?: number;
  type?: 'credit' | 'debit';
  category?: string;
  notes?: string | null;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return Response.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const { id } = await params;

  let body: UpdateTransactionBody;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Requisição inválida' }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};

  if (body.date !== undefined) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(body.date)) {
      return Response.json({ error: 'Data inválida' }, { status: 400 });
    }
    updates.date = body.date;
  }

  if (body.description !== undefined) {
    if (!body.description.trim()) {
      return Response.json({ error: 'Descrição obrigatória' }, { status: 400 });
    }
    if (body.description.trim().length > 255) {
      return Response.json({ error: 'Descrição muito longa (máximo 255 caracteres)' }, { status: 400 });
    }
    updates.description = body.description.trim();
  }

  if (body.amount !== undefined) {
    if (body.amount <= 0 || body.amount > 999999.99) {
      return Response.json({ error: 'Valor inválido' }, { status: 400 });
    }
    // Determine sign from type (if provided) or from current record
    const effectiveType = body.type ?? null;
    if (effectiveType) {
      updates.amount = effectiveType === 'debit' ? -Math.abs(body.amount) : Math.abs(body.amount);
    } else {
      updates.amount = body.amount; // will be adjusted below with type
    }
  }

  if (body.type !== undefined) {
    if (body.type !== 'credit' && body.type !== 'debit') {
      return Response.json({ error: 'Tipo inválido' }, { status: 400 });
    }
    updates.type = body.type;
    // Re-sign amount if both provided
    if (body.amount !== undefined) {
      updates.amount = body.type === 'debit' ? -Math.abs(body.amount) : Math.abs(body.amount);
    }
  }

  if (body.category !== undefined) {
    const sanitizedCategory = sanitizeCategory(body.category ?? '');
    if (!sanitizedCategory) {
      return Response.json({ error: 'Categoria inválida' }, { status: 400 });
    }
    updates.category = sanitizedCategory;
    updates.category_source = 'user';
  }

  if (body.notes !== undefined) {
    if (body.notes !== null && body.notes.length > 500) {
      return Response.json({ error: 'Nota muito longa (máximo 500 caracteres)' }, { status: 400 });
    }
    updates.notes = body.notes;
  }

  if (Object.keys(updates).length === 0) {
    return Response.json({ error: 'Nenhum campo para atualizar' }, { status: 400 });
  }

  // RLS guarantees user_id match; .eq('user_id', user.id) is belt-and-suspenders
  const { data: transaction, error: updateError } = await supabase
    .from('transactions')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (updateError) {
    if (updateError.code === 'PGRST116') {
      return Response.json({ error: 'Transação não encontrada' }, { status: 404 });
    }
    console.error('[transactions] PATCH update error:', updateError);
    return Response.json({ error: 'Erro ao atualizar transação' }, { status: 500 });
  }

  return Response.json(transaction);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return Response.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const { id } = await params;

  const { error: deleteError, count } = await supabase
    .from('transactions')
    .delete({ count: 'exact' })
    .eq('id', id)
    .eq('user_id', user.id);

  if (deleteError) {
    console.error('[transactions] DELETE error:', deleteError);
    return Response.json({ error: 'Erro ao excluir transação' }, { status: 500 });
  }

  if (!count) {
    return Response.json({ error: 'Transação não encontrada' }, { status: 404 });
  }

  return new Response(null, { status: 204 });
}
