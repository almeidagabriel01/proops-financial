import { createClient } from '@/lib/supabase/server';

function normalizeTag(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, '-');
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return Response.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const { id: transactionId } = await params;

  let body: { tag?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Requisição inválida' }, { status: 400 });
  }

  if (!body.tag || typeof body.tag !== 'string') {
    return Response.json({ error: 'Campo tag é obrigatório' }, { status: 400 });
  }

  const tag = normalizeTag(body.tag);

  if (tag.length === 0 || tag.length > 50) {
    return Response.json({ error: 'Tag inválida (1–50 caracteres)' }, { status: 400 });
  }

  // Verify the transaction belongs to the user (RLS also enforces this)
  const { data: tx, error: txError } = await supabase
    .from('transactions')
    .select('id')
    .eq('id', transactionId)
    .eq('user_id', user.id)
    .single();

  if (txError || !tx) {
    return Response.json({ error: 'Transação não encontrada' }, { status: 404 });
  }

  // Idempotent insert — ignore if already exists
  const { error: insertError } = await supabase.from('transaction_tags').upsert(
    { transaction_id: transactionId, user_id: user.id, tag },
    { onConflict: 'transaction_id,tag', ignoreDuplicates: true },
  );

  if (insertError) {
    console.error('[tags/route] insert error:', insertError);
    return Response.json({ error: 'Erro ao adicionar tag' }, { status: 500 });
  }

  return Response.json({ tag }, { status: 201 });
}
