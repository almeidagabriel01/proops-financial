import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { getStripe } from '@/lib/billing/stripe';
import { mapStripeStatus } from '@/lib/billing/webhook-handler';

// Safety net: called by Stripe success_url redirect.
// Ensures DB state is consistent even if webhooks are delayed or missed.
export async function GET() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.redirect(`${appUrl}/login`);

    const serviceSupabase = await createServiceClient();
    const { data: profile } = await serviceSupabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();

    const stripeCustomerId = (profile?.stripe_customer_id as string | null) ?? null;
    if (!stripeCustomerId) {
      return NextResponse.redirect(`${appUrl}/dashboard?checkout=success`);
    }

    const stripe = getStripe();
    const [activeSubs, trialingSubs] = await Promise.all([
      stripe.subscriptions.list({ customer: stripeCustomerId, status: 'active', limit: 1 }),
      stripe.subscriptions.list({ customer: stripeCustomerId, status: 'trialing', limit: 1 }),
    ]);

    const currentSub = activeSubs.data[0] ?? trialingSubs.data[0] ?? null;
    if (currentSub) {
      const item = currentSub.items.data[0];
      const billingCycle: 'monthly' | 'annual' =
        item?.price.recurring?.interval === 'year' ? 'annual' : 'monthly';
      const periodStart = item
        ? new Date(item.current_period_start * 1000).toISOString().split('T')[0]
        : null;
      const periodEnd = item
        ? new Date(item.current_period_end * 1000).toISOString().split('T')[0]
        : null;

      // Use actual Stripe status (not hardcoded 'active')
      const status = mapStripeStatus(currentSub.status);

      await serviceSupabase.from('subscriptions').upsert(
        {
          user_id: user.id,
          stripe_subscription_id: currentSub.id,
          billing_cycle: billingCycle,
          status,
          current_period_start: periodStart,
          current_period_end: periodEnd,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'stripe_subscription_id' }
      );

      if (currentSub.status === 'trialing' && currentSub.trial_end) {
        await serviceSupabase
          .from('profiles')
          .update({
            trial_ends_at: new Date(currentSub.trial_end * 1000).toISOString(),
          })
          .eq('id', user.id);
      } else if (currentSub.status === 'active') {
        await serviceSupabase
          .from('profiles')
          .update({ trial_ends_at: null })
          .eq('id', user.id);
      }
    }
  } catch (err) {
    console.error('[sync-success]', err);
    // Never block the redirect — user must land on dashboard
  }

  return NextResponse.redirect(`${appUrl}/dashboard?checkout=success`);
}
