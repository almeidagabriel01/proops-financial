import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface SubscribeBody {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export async function POST(request: Request) {
  // Graceful degradation: push desabilitado se VAPID não configurado
  if (!process.env.VAPID_PRIVATE_KEY) {
    return NextResponse.json({ subscribed: false, reason: 'push_disabled' });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  let body: SubscribeBody;
  try {
    body = (await request.json()) as SubscribeBody;
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 });
  }

  const { endpoint, keys } = body;
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return NextResponse.json({ error: 'endpoint e keys são obrigatórios' }, { status: 400 });
  }

  // Upsert: ON CONFLICT (user_id, endpoint) atualiza as keys
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('push_subscriptions')
    .upsert({ user_id: user.id, endpoint, keys }, { onConflict: 'user_id,endpoint' });

  if (error) {
    console.error('[push/subscribe] Erro ao salvar subscription:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }

  return NextResponse.json({ subscribed: true });
}
