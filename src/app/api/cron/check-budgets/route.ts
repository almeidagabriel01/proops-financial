// Endpoint do Vercel Cron Job para alertas de orçamento.
// Rota interna — validada via CRON_SECRET (Vercel injeta automaticamente
// Authorization: Bearer ${CRON_SECRET} em chamadas de cron configurado em vercel.json).
// Chamado também por /api/import em background após categorização (AC5).

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const response = await fetch(`${supabaseUrl}/functions/v1/check-budget-alerts`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const body = await response.text();
    console.error('[cron/check-budgets] Edge Function error:', response.status, body);
    return Response.json({ error: 'Edge Function failed' }, { status: 500 });
  }

  return Response.json({ ok: true, timestamp: new Date().toISOString() });
}
