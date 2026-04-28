import { type NextRequest, NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { getStripe } from '@/lib/billing/stripe';
import { mapStripeStatus, getPlanTierFromPriceId } from '@/lib/billing/webhook-handler';
import { getAppUrl } from '@/lib/utils/app-url';

// Safety net: called by Stripe success_url redirect.
// Ensures DB state is consistent even if webhooks are delayed or missed.
// Uses session_id (Stripe-verified) as primary auth — no cookie dependency.
export async function GET(request: NextRequest) {
  const appUrl = getAppUrl();
  const sessionId = request.nextUrl.searchParams.get('session_id');

  if (!sessionId) {
    // No session_id — try cookie-based fallback to dashboard
    return NextResponse.redirect(`${appUrl}/dashboard?checkout=success`);
  }

  const serviceSupabase = await createServiceClient();
  let userId: string | null = null;

  try {
    // Expand subscription so we get it in one call — avoids race conditions
    const stripeSession = await getStripe().checkout.sessions.retrieve(sessionId, {
      expand: ['subscription'],
    });

    const isPaid =
      stripeSession.payment_status === 'paid' ||
      stripeSession.payment_status === 'no_payment_required' ||
      stripeSession.status === 'complete';

    if (!isPaid) {
      console.warn('[sync-success] session not paid:', stripeSession.payment_status, stripeSession.status);
      return NextResponse.redirect(`${appUrl}/paywall`);
    }

    const stripeCustomerId =
      typeof stripeSession.customer === 'string'
        ? stripeSession.customer
        : (stripeSession.customer as Stripe.Customer | Stripe.DeletedCustomer | null)?.id ?? null;

    // Resolve userId from stripe_customer_id
    if (stripeCustomerId) {
      const { data: profile } = await serviceSupabase
        .from('profiles')
        .select('id')
        .eq('stripe_customer_id', stripeCustomerId)
        .single();
      userId = profile?.id ?? null;
    }

    // Fallback: cookie-based session (covers cases where stripe_customer_id isn't set yet)
    if (!userId) {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        console.warn('[sync-success] no user from session cookie');
        return NextResponse.redirect(`${appUrl}/login`);
      }
      userId = user.id;
    }

    // Get subscription directly from the expanded session
    const sub = stripeSession.subscription as Stripe.Subscription | null;

    if (sub) {
      const item = sub.items.data[0];
      const billingCycle: 'monthly' | 'annual' =
        item?.price.recurring?.interval === 'year' ? 'annual' : 'monthly';
      const periodStart = item
        ? new Date(item.current_period_start * 1000).toISOString().split('T')[0]
        : null;
      const periodEnd = item
        ? new Date(item.current_period_end * 1000).toISOString().split('T')[0]
        : null;
      const status = mapStripeStatus(sub.status);
      const planTier = getPlanTierFromPriceId(item?.price.id);

      await serviceSupabase.from('subscriptions').upsert(
        {
          user_id: userId,
          stripe_subscription_id: sub.id,
          billing_cycle: billingCycle,
          status,
          current_period_start: periodStart,
          current_period_end: periodEnd,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'stripe_subscription_id' },
      );

      // Explicit profile update — DB trigger sets plan='pro' blindly, so override with correct tier
      if (sub.status === 'trialing' && sub.trial_end) {
        const { error } = await serviceSupabase
          .from('profiles')
          .update({
            plan: planTier,
            audio_enabled: planTier === 'pro',
            trial_ends_at: new Date(sub.trial_end * 1000).toISOString(),
            subscription_status: 'trialing',
          })
          .eq('id', userId);
        if (error) console.error('[sync-success] profile update trialing error:', error);
      } else if (sub.status === 'active') {
        const { error } = await serviceSupabase
          .from('profiles')
          .update({
            plan: planTier,
            audio_enabled: planTier === 'pro',
            trial_ends_at: null,
            subscription_status: 'active',
          })
          .eq('id', userId);
        if (error) console.error('[sync-success] profile update active error:', error);
      }
    } else {
      console.warn('[sync-success] no subscription on session', sessionId);
    }
  } catch (err) {
    console.error('[sync-success] unexpected error:', err);
  }

  return NextResponse.redirect(`${appUrl}/dashboard?checkout=success`);
}
