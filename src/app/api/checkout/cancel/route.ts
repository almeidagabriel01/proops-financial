import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { getStripe } from '@/lib/billing/stripe';

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { subscriptionId }: { subscriptionId: string } = await req.json();
  if (!subscriptionId) {
    return NextResponse.json({ error: 'subscriptionId required' }, { status: 400 });
  }

  // Verify the subscription belongs to this user before canceling
  const serviceSupabase = await createServiceClient();
  const { data: sub } = await serviceSupabase
    .from('subscriptions')
    .select('user_id')
    .eq('stripe_subscription_id', subscriptionId)
    .single();

  if (!sub || sub.user_id !== user.id) {
    return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
  }

  // Cancel at period end — user keeps access until billing cycle ends
  await getStripe().subscriptions.update(subscriptionId, { cancel_at_period_end: true });

  // Mark locally — webhook will also fire but this ensures immediate UI feedback
  await serviceSupabase
    .from('subscriptions')
    .update({ cancel_at_period_end: true, updated_at: new Date().toISOString() })
    .eq('stripe_subscription_id', subscriptionId);

  return NextResponse.json({ ok: true });
}
