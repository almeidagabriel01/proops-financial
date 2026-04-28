import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { getStripe } from '@/lib/billing/stripe';
import { createCheckoutSession } from '@/lib/billing/checkout';
import { mapStripeStatus } from '@/lib/billing/webhook-handler';

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const serviceSupabase = await createServiceClient();
  const { data: profile } = await serviceSupabase
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', user.id)
    .single();

  const stripeCustomerId = (profile?.stripe_customer_id as string | null) ?? null;

  if (stripeCustomerId) {
    const stripe = getStripe();
    const subs = await stripe.subscriptions.list({
      customer: stripeCustomerId,
      status: 'trialing',
      limit: 1,
    });

    if (subs.data.length > 0) {
      const subId = subs.data[0].id;

      // End trial immediately — Stripe invoices and charges right away
      await stripe.subscriptions.update(subId, { trial_end: 'now' });

      // Fetch updated subscription to sync DB before client reloads (avoid race condition)
      const updatedSub = await stripe.subscriptions.retrieve(subId);
      const newStatus = mapStripeStatus(updatedSub.status);

      await serviceSupabase.from('subscriptions').upsert(
        {
          user_id: user.id,
          stripe_subscription_id: subId,
          billing_cycle: subs.data[0].items.data[0]?.price.recurring?.interval === 'year'
            ? 'annual'
            : 'monthly',
          status: newStatus,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'stripe_subscription_id' }
      );

      // Clear trial in profile immediately so client reload reflects paid state
      await serviceSupabase
        .from('profiles')
        .update({ trial_ends_at: null, subscription_status: newStatus })
        .eq('id', user.id);

      return NextResponse.json({ ok: true, action: 'trial_ended' });
    }
  }

  // No Stripe trial found — create a proper checkout for immediate payment
  try {
    const checkoutUrl = await createCheckoutSession(
      user.id,
      user.email,
      'pro_monthly',
      false
    );
    return NextResponse.json({ ok: true, action: 'checkout', checkoutUrl });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao criar checkout';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
