import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { detectSubscriptions } from '@/lib/subscriptions/detect-subscriptions';

/**
 * POST /api/subscriptions/detect
 * Triggers subscription re-detection for the authenticated user.
 * Fire-and-forget from /api/import; can also be called manually from settings.
 */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  await detectSubscriptions(supabase, user.id);

  return NextResponse.json({ ok: true });
}
