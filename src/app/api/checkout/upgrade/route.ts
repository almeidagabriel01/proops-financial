import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { getStripe, STRIPE_PRICE_IDS, type StripePlanKey } from '@/lib/billing/stripe';
import { PRO_PLAN_KEYS } from '@/lib/billing/plans';
import { createCheckoutSession } from '@/lib/billing/checkout';

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { planKey, withTrial }: { planKey: StripePlanKey; withTrial: boolean } = await req.json();
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

    // paymentMethods.list é mais confiável que invoice_settings.default_payment_method
    const list = await stripe.paymentMethods.list({
      customer: stripeCustomerId,
      type: 'card',
      limit: 1,
    });
    const pmId = list.data[0]?.id ?? null;

    if (pmId) {
      const priceId = STRIPE_PRICE_IDS[planKey];
      const isProPlan = (PRO_PLAN_KEYS as readonly string[]).includes(planKey);
      const applyTrial = withTrial && isProPlan;
      const billingCycle: 'monthly' | 'annual' = planKey.endsWith('_annual') ? 'annual' : 'monthly';

      const [activeSubs, trialingSubs] = await Promise.all([
        stripe.subscriptions.list({ customer: stripeCustomerId, status: 'active', limit: 1 }),
        stripe.subscriptions.list({ customer: stripeCustomerId, status: 'trialing', limit: 1 }),
      ]);
      const currentSub = activeSubs.data[0] ?? trialingSubs.data[0] ?? null;

      // Upgrade agendado: se tem assinatura ativa e não é trial
      // Usuário continua no plano atual até o fim do período, Pro começa na renovação
      if (currentSub && !applyTrial) {
        const currentItem = currentSub.items.data[0];
        const currentPriceId =
          typeof currentItem.price === 'string' ? currentItem.price : currentItem.price.id;
        const currentPeriodEnd = currentItem.current_period_end; // Unix timestamp

        const schedule = await stripe.subscriptionSchedules.create({
          from_subscription: currentSub.id,
        });

        await stripe.subscriptionSchedules.update(schedule.id, {
          phases: [
            {
              items: [{ price: currentPriceId, quantity: 1 }],
              start_date: schedule.phases[0].start_date as number,
              end_date: currentPeriodEnd,
              proration_behavior: 'none',
            },
            {
              items: [{ price: priceId, quantity: 1 }],
            },
          ],
          end_behavior: 'release',
        });

        await serviceSupabase
          .from('subscriptions')
          .update({ pending_plan: 'pro', updated_at: new Date().toISOString() })
          .eq('stripe_subscription_id', currentSub.id);

        const periodEnd = new Date(currentPeriodEnd * 1000).toISOString();
        return NextResponse.json({ action: 'scheduled_upgrade', periodEnd });
      }

      // Sem assinatura existente ou trial: criar/atualizar imediatamente
      let sub: Stripe.Subscription;
      if (currentSub) {
        sub = await stripe.subscriptions.update(currentSub.id, {
          items: [{ id: currentSub.items.data[0].id, price: priceId }],
          proration_behavior: 'create_prorations',
          cancel_at_period_end: false,
          default_payment_method: pmId,
        });
      } else {
        sub = await stripe.subscriptions.create({
          customer: stripeCustomerId,
          items: [{ price: priceId }],
          default_payment_method: pmId,
          metadata: { supabase_user_id: user.id },
          ...(applyTrial && {
            trial_period_days: 7,
            trial_settings: { end_behavior: { missing_payment_method: 'cancel' } },
          }),
        });
      }

      const periodEndTs = sub.items.data[0]?.current_period_end;
      const periodEnd = periodEndTs ? new Date(periodEndTs * 1000).toISOString() : null;

      const validStatuses = ['pending', 'active', 'canceled', 'trialing', 'past_due', 'expired'] as const;
      type ValidStatus = typeof validStatuses[number];
      const subStatus: ValidStatus = (validStatuses as readonly string[]).includes(sub.status)
        ? (sub.status as ValidStatus)
        : 'active';

      await serviceSupabase.from('subscriptions').upsert(
        {
          user_id: user.id,
          stripe_subscription_id: sub.id,
          billing_cycle: billingCycle,
          status: subStatus,
          current_period_end: periodEnd,
          cancel_at_period_end: false,
          pending_plan: null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'stripe_subscription_id' }
      );

      await serviceSupabase
        .from('profiles')
        .update({ plan: 'pro', subscription_status: subStatus })
        .eq('id', user.id);

      return NextResponse.json({ action: applyTrial ? 'trial_started' : 'subscribed' });
    }
  }

  // Sem cartão salvo — fallback para Stripe Checkout
  try {
    const checkoutUrl = await createCheckoutSession(user.id, user.email, planKey, withTrial);
    return NextResponse.json({ action: 'checkout', checkoutUrl });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao criar checkout';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
