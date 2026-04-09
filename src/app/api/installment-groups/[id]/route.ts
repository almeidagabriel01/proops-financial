import { createClient } from '@/lib/supabase/server';

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
    .from('installment_groups')
    .select(
      `*,
      scheduled_transactions(id, installment_number, status, due_date, amount, paid_at)`
    )
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) {
    console.error('[installment-groups GET id]', error);
    return Response.json({ error: 'Erro ao buscar grupo de parcelas' }, { status: 500 });
  }
  if (!data) {
    return Response.json({ error: 'Grupo de parcelas não encontrado' }, { status: 404 });
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

  // scheduled_transactions tem ON DELETE CASCADE, então são removidos automaticamente
  const { error, count } = await supabase
    .from('installment_groups')
    .delete({ count: 'exact' })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    console.error('[installment-groups DELETE]', error);
    return Response.json({ error: 'Erro ao excluir grupo de parcelas' }, { status: 500 });
  }
  if (!count) {
    return Response.json({ error: 'Grupo de parcelas não encontrado' }, { status: 404 });
  }

  return new Response(null, { status: 204 });
}
