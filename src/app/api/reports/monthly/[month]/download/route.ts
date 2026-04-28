import { createClient } from '@/lib/supabase/server';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ month: string }> },
) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return Response.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const { month } = await params;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: report } = await (supabase as any)
    .from('monthly_reports')
    .select('pdf_storage_path, status')
    .eq('user_id', user.id)
    .eq('month', `${month}-01`)
    .single();

  if (!report || report.status !== 'completed' || !report.pdf_storage_path) {
    return Response.json({ error: 'Relatório não encontrado' }, { status: 404 });
  }

  const { data: signedUrl, error: urlError } = await supabase.storage
    .from('reports')
    .createSignedUrl(report.pdf_storage_path, 3600);

  if (urlError || !signedUrl) {
    console.error('[reports/download]', urlError);
    return Response.json({ error: 'Erro ao gerar URL de download' }, { status: 500 });
  }

  return Response.json({ url: signedUrl.signedUrl });
}
