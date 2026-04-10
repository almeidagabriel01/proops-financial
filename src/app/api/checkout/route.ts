import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { getStripe, STRIPE_PRICE_IDS, type StripePlanKey } from '@/lib/billing/stripe';

export async function POST(req: Request) {
  // Auth check
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json() as { planKey?: string };
  const planKey = body.planKey as StripePlanKey | undefined;
  if (!planKey || !STRIPE_PRICE_IDS[planKey]) {
    return NextResponse.json({ error: 'Invalid planKey' }, { status: 400 });
  }

  const priceId = STRIPE_PRICE_IDS[planKey];
  if (!priceId) {
    return NextResponse.json({ error: `Price ID not configured for ${planKey}` }, { status: 500 });
  }

  // Load profile (for display_name and existing stripe_customer_id)
  const serviceSupabase = await createServiceClient();
  const { data: profile, error: profileError } = await serviceSupabase
    .from('profiles')
    .select('display_name, stripe_customer_id')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 500 });
  }

  const stripe = getStripe();

  // Ensure Stripe customer exists
  let stripeCustomerId = profile.stripe_customer_id as string | null;
  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({
      name: profile.display_name ?? undefined,
      email: user.email,
      metadata: { supabase_user_id: user.id },
    });
    stripeCustomerId = customer.id;
    await serviceSupabase
      .from('profiles')
      .update({ stripe_customer_id: stripeCustomerId })
      .eq('id', user.id);
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const billingCycle: 'monthly' | 'annual' = planKey.endsWith('_annual') ? 'annual' : 'monthly';

  // Create Stripe Checkout Session (hosted — no custom card UI needed)
  const session = await stripe.checkout.sessions.create({
    customer: stripeCustomerId,
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/settings?tab=plano&checkout=success`,
    cancel_url: `${appUrl}/settings?tab=plano&checkout=canceled`,
    metadata: { billing_cycle: billingCycle },
    subscription_data: { metadata: { supabase_user_id: user.id } },
  });

  // Save pending subscription so webhook can map event → user_id
  if (session.subscription) {
    const stripeSubscriptionId = typeof session.subscription === 'string'
      ? session.subscription
      : session.subscription.id;
    await serviceSupabase.from('subscriptions').upsert(
      {
        user_id: user.id,
        stripe_subscription_id: stripeSubscriptionId,
        billing_cycle: billingCycle,
        status: 'pending',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'stripe_subscription_id' }
    );
  }

  return NextResponse.json({ checkoutUrl: session.url ?? '' });
}
