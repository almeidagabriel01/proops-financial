import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { sendPushNotification } from '@/lib/push/config';

interface SendBody {
  user_id: string;
  title: string;
  body: string;
  url?: string;
}

interface PushSubscription {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

// Rota interna — acessível apenas por callers com SUPABASE_SERVICE_ROLE_KEY.
// Nunca exposta ao frontend. Chamada exclusivamente pela Edge Function check-budget-alerts (C1.4).
export async function POST(request: Request) {
  const authHeader = request.headers.get('Authorization');
  const expectedToken = `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`;
  if (!authHeader || authHeader !== expectedToken) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  let body: SendBody;
  try {
    body = (await request.json()) as SendBody;
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 });
  }

  const { user_id, title, body: message, url } = body;
  if (!user_id || !title || !message) {
    return NextResponse.json({ error: 'user_id, title e body são obrigatórios' }, { status: 400 });
  }

  const supabase = await createServiceClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: subscriptions } = await (supabase as any)
    .from('push_subscriptions')
    .select('endpoint, keys')
    .eq('user_id', user_id);

  if (!subscriptions?.length) {
    return NextResponse.json({ sent: 0, failed: 0 });
  }

  let sent = 0;
  let failed = 0;
  const expiredEndpoints: string[] = [];

  await Promise.all(
    (subscriptions as PushSubscription[]).map(async (sub) => {
      try {
        await sendPushNotification(
          { endpoint: sub.endpoint, keys: sub.keys },
          JSON.stringify({ title, body: message, url: url ?? '/dashboard' }),
        );
        sent++;
      } catch (err: unknown) {
        const statusCode = (err as { statusCode?: number }).statusCode;
        if (statusCode === 410 || statusCode === 404) {
          // Endpoint expirado — marcar para remoção
          expiredEndpoints.push(sub.endpoint);
        }
        failed++;
        console.error('[push/send] Falha ao enviar para endpoint:', sub.endpoint, err);
      }
    }),
  );

  // Remover subscriptions expiradas em paralelo
  if (expiredEndpoints.length > 0) {
    await Promise.all(
      expiredEndpoints.map((endpoint) =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any)
          .from('push_subscriptions')
          .delete()
          .eq('user_id', user_id)
          .eq('endpoint', endpoint),
      ),
    );
  }

  return NextResponse.json({ sent, failed });
}
