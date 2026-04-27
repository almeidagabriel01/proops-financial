import { createServiceClient } from '@/lib/supabase/server';
import { getStripe, STRIPE_PRICE_IDS, type StripePlanKey } from '@/lib/billing/stripe';
import { PRO_PLAN_KEYS } from '@/lib/billing/plans';

/**
 * Cria uma Stripe Checkout Session e persiste subscription pendente.
 * Retorna a URL do checkout para redirect.
 * withTrial só é válido para planos Pro — validação deve ser feita antes de chamar.
 */
export async function createCheckoutSession(
  userId: string,
  userEmail: string | undefined,
  planKey: StripePlanKey,
  withTrial: boolean
): Promise<string> {
  const serviceSupabase = await createServiceClient();

  const { data: profile, error: profileError } = await serviceSupabase
    .from('profiles')
    .select('display_name, stripe_customer_id')
    .eq('id', userId)
    .single();

  if (profileError || !profile) throw new Error('Profile not found');

  const stripe = getStripe();

  let stripeCustomerId = (profile.stripe_customer_id as string | null) ?? null;
  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({
      name: profile.display_name ?? undefined,
      email: userEmail,
      metadata: { supabase_user_id: userId },
    });
    stripeCustomerId = customer.id;
    await serviceSupabase
      .from('profiles')
      .update({ stripe_customer_id: stripeCustomerId })
      .eq('id', userId);
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const billingCycle: 'monthly' | 'annual' = planKey.endsWith('_annual') ? 'annual' : 'monthly';
  const priceId = STRIPE_PRICE_IDS[planKey];

  const isProPlan = (PRO_PLAN_KEYS as readonly string[]).includes(planKey);
  const applyTrial = withTrial && isProPlan;

  const session = await stripe.checkout.sessions.create({
    customer: stripeCustomerId,
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/api/checkout/sync-success`,
    cancel_url: `${appUrl}/settings?tab=plano&checkout=canceled`,
    metadata: { billing_cycle: billingCycle, with_trial: String(applyTrial) },
    payment_method_collection: 'always',
    subscription_data: {
      metadata: { supabase_user_id: userId },
      ...(applyTrial && {
        trial_period_days: 7,
        trial_settings: { end_behavior: { missing_payment_method: 'cancel' } },
      }),
    },
  });

  if (session.subscription) {
    const stripeSubscriptionId = typeof session.subscription === 'string'
      ? session.subscription
      : session.subscription.id;
    await serviceSupabase.from('subscriptions').upsert(
      {
        user_id: userId,
        stripe_subscription_id: stripeSubscriptionId,
        billing_cycle: billingCycle,
        status: 'pending',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'stripe_subscription_id' }
    );
  }

  if (!session.url) throw new Error('No checkout URL returned from Stripe');
  return session.url;
}
