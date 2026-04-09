import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/scheduled/:id/pay
 * Marca um agendamento como pago e cria a transação real correspondente.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return Response.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const { id } = await params;

  // Buscar o agendamento
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: scheduled } = await (supabase as any)
    .from('scheduled_transactions')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!scheduled) {
    return Response.json({ error: 'Agendamento não encontrado' }, { status: 404 });
  }
  if (scheduled.status === 'paid') {
    return Response.json({ error: 'Agendamento já está pago' }, { status: 409 });
  }
  if (scheduled.status === 'canceled') {
    return Response.json({ error: 'Agendamento cancelado não pode ser pago' }, { status: 409 });
  }

  // Permitir substituir data de pagamento via body (opcional)
  let paidDate = new Date().toISOString().slice(0, 10);
  try {
    const body = await request.json() as Record<string, unknown>;
    if (body.paid_date && typeof body.paid_date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.paid_date)) {
      paidDate = body.paid_date;
    }
  } catch {
    // body opcional — ignorar erro de parse
  }

  // Criar transação real
  const { data: transaction, error: txError } = await supabase
    .from('transactions')
    .insert({
      user_id: user.id,
      bank_account_id: scheduled.bank_account_id,
      external_id: `scheduled_${id}`,
      date: paidDate,
      description: scheduled.description,
      amount: scheduled.type === 'debit' ? -Math.abs(scheduled.amount) : Math.abs(scheduled.amount),
      type: scheduled.type,
      category: scheduled.category,
      category_source: 'user',
      installment_group_id: scheduled.installment_group_id ?? null,
      installment_number: scheduled.installment_number ?? null,
      recurring_rule_id: scheduled.recurring_rule_id ?? null,
    })
    .select('id')
    .single();

  if (txError) {
    console.error('[scheduled pay] transaction insert error:', txError);
    return Response.json({ error: 'Erro ao criar transação' }, { status: 500 });
  }

  // Marcar agendamento como pago
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: updated, error: updateError } = await (supabase as any)
    .from('scheduled_transactions')
    .update({
      status: 'paid',
      paid_transaction_id: transaction.id,
      paid_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (updateError) {
    console.error('[scheduled pay] update error:', updateError);
    return Response.json({ error: 'Erro ao atualizar agendamento' }, { status: 500 });
  }

  return Response.json({ data: updated, transaction_id: transaction.id });
}
