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

    const [activeSubs, trialingSubs] = await Promise.all([
      stripe.subscriptions.list({ customer: stripeCustomerId, status: 'active', limit: 1 }),
      stripe.subscriptions.list({ customer: stripeCustomerId, status: 'trialing', limit: 1 }),
    ]);

    const currentSub = activeSubs.data[0] ?? trialingSubs.data[0] ?? null;

    if (currentSub) {
      if (currentSub.status === 'trialing') {
        // For trial users: end trial immediately and redirect to Basic checkout
        await stripe.subscriptions.update(currentSub.id, {
          cancel_at_period_end: true,
          trial_end: 'now' as const,
        });
        const checkoutUrl = await createCheckoutSession(user.id, user.email, planKey, false);
        return NextResponse.json({ ok: true, action: 'checkout', checkoutUrl });
      }

      // Active paid subscription: schedule cancellation at period end.
      // User keeps Pro until current_period_end; customer.subscription.deleted fires then
      // and sets profiles.plan = 'basic'.
      await stripe.subscriptions.update(currentSub.id, {
        cancel_at_period_end: true,
      });

      await serviceSupabase
        .from('subscriptions')
        .update({ cancel_at_period_end: true, pending_plan: 'basic', updated_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .eq('status', 'active');

      const periodEndTs = currentSub.items.data[0]?.current_period_end;
      const periodEnd = periodEndTs ? new Date(periodEndTs * 1000).toISOString() : null;

      return NextResponse.json({ ok: true, action: 'scheduled_downgrade', periodEnd });
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
