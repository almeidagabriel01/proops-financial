import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { getStripe, STRIPE_PRICE_IDS, type StripePlanKey } from '@/lib/billing/stripe';
import { createCheckoutSession } from '@/lib/billing/checkout';

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { planKey }: { planKey: StripePlanKey } = await req.json();
  if (!planKey || !STRIPE_PRICE_IDS[planKey]) {
    return NextResponse.json({ error: 'planKey inválido' }, { status: 400 });
  }

  const serviceSupabase = await createServiceClient();
  const { data: profile } = await serviceSupabase
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', user.id)
    .single();

  const stripeCustomerId = (profile?.stripe_customer_id as string | null) ?? null;

  if (stripeCustomerId) {
    const stripe = getStripe();

    // Check for active or trialing subscription
    const [activeSubs, trialingSubs] = await Promise.all([
      stripe.subscriptions.list({ customer: stripeCustomerId, status: 'active', limit: 1 }),
      stripe.subscriptions.list({ customer: stripeCustomerId, status: 'trialing', limit: 1 }),
    ]);

    const currentSub = activeSubs.data[0] ?? trialingSubs.data[0] ?? null;

    if (currentSub) {
      const currentItem = currentSub.items.data[0];
      await stripe.subscriptions.update(currentSub.id, {
        items: [{ id: currentItem.id, price: STRIPE_PRICE_IDS[planKey] }],
        proration_behavior: 'create_prorations',
        // End trial immediately when downgrading from trial
        ...(currentSub.status === 'trialing' ? { trial_end: 'now' as const } : {}),
      });
      return NextResponse.json({ ok: true, action: 'downgraded' });
    }
  }

  // No active Stripe subscription — create a new checkout for the target plan
  try {
    const checkoutUrl = await createCheckoutSession(user.id, user.email, planKey, false);
    return NextResponse.json({ ok: true, action: 'checkout', checkoutUrl });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao criar checkout';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
