import type { SupabaseClient } from '@supabase/supabase-js';
import type Stripe from 'stripe';
import { getStripe, STRIPE_PRICE_IDS } from '@/lib/billing/stripe';

// Determines plan tier from Stripe price ID.
// Defaults to 'pro' if price ID is unknown (safe fallback).
export function getPlanTierFromPriceId(priceId: string | undefined): 'basic' | 'pro' {
  if (!priceId) return 'pro';
  const basicIds = [STRIPE_PRICE_IDS.basic_monthly, STRIPE_PRICE_IDS.basic_annual].filter(Boolean);
  return basicIds.includes(priceId) ? 'basic' : 'pro';
}

// Grace period: 3 days after invoice.payment_failed before revoking access
const GRACE_PERIOD_DAYS = 3;

export function isWithinGracePeriod(updatedAt: string): boolean {
  const updatedMs = new Date(updatedAt).getTime();
  const nowMs = Date.now();
  return nowMs - updatedMs < GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000;
}

export async function handleStripeWebhook(
  event: Stripe.Event,
  supabase: SupabaseClient
): Promise<void> {
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode !== 'subscription' || !session.subscription || !session.customer) break;

      const stripeCustomerId = typeof session.customer === 'string'
        ? session.customer
        : session.customer.id;
      const stripeSubscriptionId = typeof session.subscription === 'string'
        ? session.subscription
        : session.subscription.id;

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('stripe_customer_id', stripeCustomerId)
        .single();

      if (!profile) {
        console.warn(`[webhook] checkout.session.completed: no profile for customer ${stripeCustomerId}`);
        break;
      }

      // Fetch actual subscription to get real status (not hardcoded 'active')
      const subscription = await getStripe().subscriptions.retrieve(stripeSubscriptionId);
      const status = mapStripeStatus(subscription.status);
      const priceId = subscription.items.data[0]?.price.id;
      const planTier = getPlanTierFromPriceId(priceId);

      await supabase.from('subscriptions').upsert(
        {
          user_id: profile.id,
          stripe_subscription_id: stripeSubscriptionId,
          billing_cycle: resolveBillingCycle(session),
          status,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'stripe_subscription_id' }
      );

      // Sync plan tier + trial state explicitly (DB trigger sets plan='pro' blindly — override it)
      if (subscription.status === 'trialing' && subscription.trial_end) {
        await supabase
          .from('profiles')
          .update({
            plan: planTier,
            audio_enabled: planTier === 'pro',
            trial_ends_at: new Date(subscription.trial_end * 1000).toISOString(),
            subscription_status: 'trialing',
          })
          .eq('id', profile.id);
      } else {
        // Not a trial — clear any legacy trial marker
        await supabase
          .from('profiles')
          .update({
            plan: planTier,
            audio_enabled: planTier === 'pro',
            trial_ends_at: null,
            subscription_status: 'active',
          })
          .eq('id', profile.id);
      }
      break;
    }

    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription;
      const status = mapStripeStatus(sub.status);
      const item = sub.items?.data[0];
      const periodUpdate = item
        ? {
            current_period_start: new Date(item.current_period_start * 1000).toISOString().split('T')[0],
            current_period_end: new Date(item.current_period_end * 1000).toISOString().split('T')[0],
          }
        : {};

      const { data: rows } = await supabase
        .from('subscriptions')
        .update({ status, ...periodUpdate, updated_at: new Date().toISOString() })
        .eq('stripe_subscription_id', sub.id)
        .select('user_id');

      if (!rows?.length) {
        // Row não existe ainda (race com checkout.session.completed) — lança erro
        // para que o route retorne 500 e o Stripe reenvie o evento.
        throw new Error(`[webhook] customer.subscription.updated: no row for ${sub.id}`);
      }

      const userId = rows[0].user_id as string;

      const subPriceId = item?.price.id;
      const subPlanTier = getPlanTierFromPriceId(subPriceId);

      if (sub.status === 'trialing' && sub.trial_end) {
        await supabase
          .from('profiles')
          .update({
            plan: subPlanTier,
            audio_enabled: subPlanTier === 'pro',
            trial_ends_at: new Date(sub.trial_end * 1000).toISOString(),
            subscription_status: 'trialing',
          })
          .eq('id', userId);
      } else if (sub.status === 'active') {
        // Trial ended or immediate subscription — clear trial marker
        await supabase
          .from('profiles')
          .update({
            plan: subPlanTier,
            audio_enabled: subPlanTier === 'pro',
            trial_ends_at: null,
            subscription_status: 'active',
          })
          .eq('id', userId);
      }
      break;
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      const { data: rows } = await supabase
        .from('subscriptions')
        .update({ status: 'canceled', updated_at: new Date().toISOString() })
        .eq('stripe_subscription_id', sub.id)
        .select('id');
      if (!rows?.length) {
        console.warn(`[webhook] customer.subscription.deleted: no subscription found for ${sub.id}`);
      }
      // Trigger sync_plan_from_subscription fires → sets profiles.plan='basic', audio_enabled=false
      break;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      const subRef = invoice.parent?.subscription_details?.subscription;
      const subscriptionId = typeof subRef === 'string' ? subRef : subRef?.id;
      if (!subscriptionId) break;

      const { data: rows } = await supabase
        .from('subscriptions')
        .update({ status: 'past_due', updated_at: new Date().toISOString() })
        .eq('stripe_subscription_id', subscriptionId)
        .select('id');
      if (!rows?.length) {
        console.warn(`[webhook] invoice.payment_failed: no subscription found for ${subscriptionId}`);
      }
      break;
    }

    default:
      // Unknown event — ignore; return 200 so Stripe doesn't retry
      break;
  }
}

// Maps Stripe subscription status to our internal subscriptions.status values.
// Preserves 'trialing' as a distinct value (previously collapsed into 'active').
export function mapStripeStatus(
  stripeStatus: Stripe.Subscription.Status
): 'active' | 'trialing' | 'past_due' | 'canceled' | 'expired' | 'pending' {
  switch (stripeStatus) {
    case 'active':
      return 'active';
    case 'trialing':
      return 'trialing';
    case 'past_due':
    case 'unpaid':
      return 'past_due';
    case 'canceled':
      return 'canceled';
    case 'incomplete_expired':
      return 'expired';
    default:
      return 'pending';
  }
}

function resolveBillingCycle(session: Stripe.Checkout.Session): 'monthly' | 'annual' {
  const cycle = session.metadata?.billing_cycle;
  if (cycle === 'annual') return 'annual';
  return 'monthly';
}
