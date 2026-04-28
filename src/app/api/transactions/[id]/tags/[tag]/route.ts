import { createClient } from '@/lib/supabase/server';

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; tag: string }> },
) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return Response.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const { id: transactionId, tag } = await params;

  const decodedTag = decodeURIComponent(tag);

  const { error: deleteError, count } = await supabase
    .from('transaction_tags')
    .delete({ count: 'exact' })
    .eq('transaction_id', transactionId)
    .eq('user_id', user.id)
    .eq('tag', decodedTag);

  if (deleteError) {
    console.error('[tags/[tag]/route] delete error:', deleteError);
    return Response.json({ error: 'Erro ao remover tag' }, { status: 500 });
  }

  if (!count || count === 0) {
    return Response.json({ error: 'Tag não encontrada' }, { status: 404 });
  }

  return new Response(null, { status: 204 });
}
