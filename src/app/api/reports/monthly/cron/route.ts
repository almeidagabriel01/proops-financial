import { createClient } from '@supabase/supabase-js';

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

function prevMonthStr(): string {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const month = prevMonthStr();
  const monthDate = `${month}-01`;
  const supabase = getServiceClient();

  // Buscar todos os usuários com pelo menos 1 transação no mês anterior
  const { data: userRows, error: usersError } = await supabase
    .from('transactions')
    .select('user_id')
    .gte('date', monthDate)
    .lte('date', `${month}-31`);

  if (usersError) {
    console.error('[cron/monthly-report] Erro ao buscar usuários', usersError);
    return Response.json({ error: usersError.message }, { status: 500 });
  }

  const uniqueUserIds = [...new Set((userRows ?? []).map((r: { user_id: string }) => r.user_id))];

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:3000';

  const results = await Promise.allSettled(
    uniqueUserIds.map((userId) =>
      fetch(`${baseUrl}/api/reports/monthly/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.CRON_SECRET}`,
        },
        body: JSON.stringify({ userId, month }),
      }).then((r) => r.json()),
    ),
  );

  const succeeded = results.filter((r) => r.status === 'fulfilled').length;
  const failed = results.filter((r) => r.status === 'rejected').length;

  console.log(`[cron/monthly-report] month=${month} total=${uniqueUserIds.length} succeeded=${succeeded} failed=${failed}`);

  return Response.json({ month, total: uniqueUserIds.length, succeeded, failed });
}
