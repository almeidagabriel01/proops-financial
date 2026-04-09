import { createClient } from '@/lib/supabase/server';
import { sanitizeCategory } from '@/lib/utils/categories';

interface CreateTransactionBody {
  date: string;
  description: string;
  amount: number;
  type: 'credit' | 'debit';
  category: string;
  bank_account_id?: string;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return Response.json({ error: 'Não autorizado' }, { status: 401 });
  }

  let body: CreateTransactionBody;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Requisição inválida' }, { status: 400 });
  }

  // Server-side validation
  const { date, description, amount, type, category, bank_account_id } = body;

  if (!date || typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return Response.json({ error: 'Data inválida' }, { status: 400 });
  }
  if (!description || typeof description !== 'string' || !description.trim()) {
    return Response.json({ error: 'Descrição obrigatória' }, { status: 400 });
  }
  if (description.trim().length > 255) {
    return Response.json({ error: 'Descrição muito longa (máximo 255 caracteres)' }, { status: 400 });
  }
  if (typeof amount !== 'number' || amount <= 0 || amount > 999999.99) {
    return Response.json({ error: 'Valor inválido' }, { status: 400 });
  }
  if (type !== 'credit' && type !== 'debit') {
    return Response.json({ error: 'Tipo inválido' }, { status: 400 });
  }
  const sanitizedCategory = sanitizeCategory(category ?? '');
  if (!sanitizedCategory) {
    return Response.json({ error: 'Categoria inválida' }, { status: 400 });
  }

  // Resolve bank account
  let resolvedAccountId: string;

  if (bank_account_id) {
    // Validate the provided bank_account_id belongs to this user (RLS also covers this)
    const { data: account } = await supabase
      .from('bank_accounts')
      .select('id')
      .eq('id', bank_account_id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!account) {
      return Response.json({ error: 'Conta bancária não encontrada' }, { status: 404 });
    }
    resolvedAccountId = account.id;
  } else {
    // Use existing Manual account or create one
    const { data: existing } = await supabase
      .from('bank_accounts')
      .select('id')
      .eq('user_id', user.id)
      .eq('bank_name', 'Manual')
      .maybeSingle();

    if (existing) {
      resolvedAccountId = existing.id;
    } else {
      const { data: created, error: createError } = await supabase
        .from('bank_accounts')
        .insert({ user_id: user.id, bank_name: 'Manual', account_label: 'Lançamentos manuais' })
        .select('id')
        .single();

      if (createError || !created) {
        return Response.json({ error: 'Erro ao criar conta' }, { status: 500 });
      }
      resolvedAccountId = created.id;
    }
  }

  const signedAmount = type === 'debit' ? -Math.abs(amount) : Math.abs(amount);

  const { data: transaction, error: insertError } = await supabase
    .from('transactions')
    .insert({
      user_id: user.id,
      bank_account_id: resolvedAccountId,
      import_id: null,
      external_id: `manual_${crypto.randomUUID()}`,
      date,
      description: description.trim(),
      amount: signedAmount,
      type,
      category: sanitizedCategory,
      category_source: 'user',
      category_confidence: null,
    })
    .select()
    .single();

  if (insertError) {
    console.error('[transactions] POST insert error:', insertError);
    return Response.json({ error: 'Erro ao salvar transação' }, { status: 500 });
  }

  return Response.json(transaction, { status: 201 });
}
