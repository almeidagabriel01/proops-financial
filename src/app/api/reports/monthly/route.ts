import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return Response.json({ error: 'Não autorizado' }, { status: 401 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('monthly_reports')
    .select('id, month, status, pdf_url, email_sent_at, created_at')
    .eq('user_id', user.id)
    .order('month', { ascending: false })
    .limit(12);

  if (error) {
    console.error('[reports/monthly GET]', error);
    return Response.json({ error: 'Erro ao buscar relatórios' }, { status: 500 });
  }

  const reports = (data ?? []).map((r: {
    id: string;
    month: string;
    status: string;
    pdf_url: string | null;
    email_sent_at: string | null;
    created_at: string;
  }) => ({
    id: r.id,
    month: r.month.slice(0, 7),
    status: r.status,
    pdfUrl: r.pdf_url,
    emailSentAt: r.email_sent_at,
    createdAt: r.created_at,
  }));

  return Response.json({ data: reports });
}
