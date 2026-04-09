import { createClient } from '@/lib/supabase/server';
import { sanitizeCategory } from '@/lib/utils/categories';
import { generateFutureInstallments } from '@/lib/installments/generator';

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return Response.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const url = new URL(request.url);
  const limit = parseInt(url.searchParams.get('limit') ?? '50', 10);
  const offset = parseInt(url.searchParams.get('offset') ?? '0', 10);

  const { data, error, count } = await supabase
    .from('installment_groups')
    .select(
      `*,
      scheduled_transactions(id, installment_number, status, due_date, amount)`,
      { count: 'exact' }
    )
    .eq('user_id', user.id)
    .order('first_date', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('[installment-groups GET]', error);
    return Response.json({ error: 'Erro ao buscar grupos de parcelas' }, { status: 500 });
  }

  return Response.json({ data, total: count });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return Response.json({ error: 'Não autorizado' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Body inválido' }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const {
    description,
    total_amount,
    installment_count,
    installment_amount,
    first_date,
    category,
    bank_account_id,
    current_installment_number,
  } = b;

  if (!description || typeof description !== 'string' || (description as string).trim().length === 0) {
    return Response.json({ error: 'Descrição obrigatória' }, { status: 400 });
  }
  if (!total_amount || typeof total_amount !== 'number' || total_amount <= 0) {
    return Response.json({ error: 'Valor total inválido' }, { status: 400 });
  }
  if (!installment_count || typeof installment_count !== 'number' || installment_count < 2 || installment_count > 360) {
    return Response.json({ error: 'Número de parcelas inválido (2-360)' }, { status: 400 });
  }
  if (!installment_amount || typeof installment_amount !== 'number' || installment_amount <= 0) {
    return Response.json({ error: 'Valor da parcela inválido' }, { status: 400 });
  }
  if (!first_date || typeof first_date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(first_date as string)) {
    return Response.json({ error: 'Data da primeira parcela inválida (YYYY-MM-DD)' }, { status: 400 });
  }
  if (!bank_account_id || typeof bank_account_id !== 'string') {
    return Response.json({ error: 'Conta bancária obrigatória' }, { status: 400 });
  }

  // Verificar conta
  const { data: account } = await supabase
    .from('bank_accounts')
    .select('id')
    .eq('id', bank_account_id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!account) {
    return Response.json({ error: 'Conta bancária não encontrada' }, { status: 404 });
  }

  // current_installment_number: parcela já paga (1 por padrão para criação manual)
  const currentNum = typeof current_installment_number === 'number' ? current_installment_number : 1;
  if (currentNum < 1 || currentNum > (installment_count as number)) {
    return Response.json({ error: 'Número de parcela atual inválido' }, { status: 400 });
  }

  // Criar grupo de parcelas
  const { data: group, error: groupError } = await supabase.from('installment_groups')
    .insert({
      user_id: user.id,
      bank_account_id: bank_account_id as string,
      description: (description as string).trim().slice(0, 255),
      total_amount: total_amount as number,
      installment_count: installment_count as number,
      installment_amount: installment_amount as number,
      first_date: first_date as string,
      category: sanitizeCategory(typeof category === 'string' ? category : 'compras'),
      source: 'manual',
    })
    .select()
    .single();

  if (groupError || !group) {
    console.error('[installment-groups POST] group error:', groupError);
    return Response.json({ error: 'Erro ao criar grupo de parcelas' }, { status: 500 });
  }

  // Gerar parcelas futuras como scheduled_transactions
  const futureInstallments = generateFutureInstallments(group, currentNum);

  if (futureInstallments.length > 0) {
    const { error: schedError } = await supabase.from('scheduled_transactions')
      .insert(futureInstallments);

    if (schedError) {
      console.error('[installment-groups POST] scheduled insert error:', schedError);
      // Não falhar — parcelas podem ser criadas depois
    }
  }

  return Response.json({ data: group, futureInstallmentsCreated: futureInstallments.length }, { status: 201 });
}
