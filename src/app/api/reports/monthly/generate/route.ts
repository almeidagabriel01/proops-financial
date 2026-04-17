import { createClient } from '@supabase/supabase-js';
import { collectReportData } from '@/lib/reports/collect-report-data';
import { generateMonthlyReportPDF } from '@/lib/reports/generate-pdf';
import { sendMonthlyReportEmail } from '@/lib/email/send-monthly-report';

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { userId, month } = body as { userId: string; month: string };

  if (!userId || !month) {
    return Response.json({ error: 'userId e month são obrigatórios' }, { status: 400 });
  }

  const supabase = getServiceClient();

  // Verificar se relatório já existe e está completo
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing } = await (supabase as any)
    .from('monthly_reports')
    .select('id, status')
    .eq('user_id', userId)
    .eq('month', `${month}-01`)
    .single();

  if (existing?.status === 'completed') {
    return Response.json({ skipped: true, reason: 'already_completed' });
  }

  // Inserir/atualizar com status generating
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from('monthly_reports')
    .upsert({ user_id: userId, month: `${month}-01`, status: 'generating' }, { onConflict: 'user_id,month' });

  try {
    // Buscar perfil do usuário
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name, monthly_report_email')
      .eq('id', userId)
      .single();

    const { data: authUser } = await supabase.auth.admin.getUserById(userId);
    const userEmail = authUser?.user?.email ?? '';
    const userName = profile?.display_name ?? userEmail.split('@')[0] ?? 'usuário';

    // Coletar dados
    const reportData = await collectReportData(supabase, userId, month, userName);
    if (!reportData) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from('monthly_reports')
        .update({ status: 'failed', error_message: 'Sem transações no mês' })
        .eq('user_id', userId)
        .eq('month', `${month}-01`);
      return Response.json({ skipped: true, reason: 'no_transactions' });
    }

    // Gerar PDF
    const pdfBuffer = await generateMonthlyReportPDF(reportData);

    // Upload para Supabase Storage
    const storagePath = `${userId}/${month}.pdf`;
    await supabase.storage.from('reports').upload(storagePath, pdfBuffer, {
      contentType: 'application/pdf',
      upsert: true,
    });

    // Marcar como completed — bucket privado, signed URL gerada on-demand no /download
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('monthly_reports')
      .update({
        status: 'completed',
        pdf_storage_path: storagePath,
      })
      .eq('user_id', userId)
      .eq('month', `${month}-01`);

    // Email best-effort: falha não altera status do relatório (story out-of-scope: sem retry)
    if (profile?.monthly_report_email && userEmail) {
      try {
        await sendMonthlyReportEmail(userEmail, userName, reportData.monthLabel, month, pdfBuffer);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
          .from('monthly_reports')
          .update({ email_sent_at: new Date().toISOString() })
          .eq('user_id', userId)
          .eq('month', `${month}-01`);
      } catch (emailErr) {
        console.error('[reports/generate] email falhou (relatório permanece acessível):', emailErr);
      }
    }

    return Response.json({ success: true, userId, month });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido';
    console.error('[reports/monthly/generate]', err);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('monthly_reports')
      .update({ status: 'failed', error_message: message })
      .eq('user_id', userId)
      .eq('month', `${month}-01`);
    return Response.json({ error: message }, { status: 500 });
  }
}
