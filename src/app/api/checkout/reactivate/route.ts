import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { getStripe } from '@/lib/billing/stripe';

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const serviceSupabase = await createServiceClient();
  const { data: sub } = await serviceSupabase
    .from('subscriptions')
    .select('stripe_subscription_id')
    .eq('user_id', user.id)
    .eq('cancel_at_period_end', true)
    .in('status', ['active', 'trialing'])
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!sub?.stripe_subscription_id) {
    return NextResponse.json({ error: 'Assinatura não encontrada' }, { status: 404 });
  }

  await getStripe().subscriptions.update(sub.stripe_subscription_id, {
    cancel_at_period_end: false,
  });

  await serviceSupabase
    .from('subscriptions')
    .update({ cancel_at_period_end: false, pending_plan: null, updated_at: new Date().toISOString() })
    .eq('stripe_subscription_id', sub.stripe_subscription_id);

  return NextResponse.json({ ok: true });
}
