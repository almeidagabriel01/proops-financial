import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { getStripe } from '@/lib/billing/stripe';

export async function GET() {
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
  if (!stripeCustomerId) return NextResponse.json({ last4: null, brand: null });

  const stripe = getStripe();

  // paymentMethods.list é a fonte mais confiável —
  // invoice_settings.default_payment_method pode ser null mesmo com cartão anexado via Checkout
  const [pmList, activeSubs] = await Promise.all([
    stripe.paymentMethods.list({ customer: stripeCustomerId, type: 'card', limit: 1 }),
    stripe.subscriptions.list({ customer: stripeCustomerId, status: 'active', limit: 1 }),
  ]);

  const card = pmList.data[0]?.card;
  if (!card?.last4) return NextResponse.json({ last4: null, brand: null });

  const periodEndTs = activeSubs.data[0]?.items.data[0]?.current_period_end ?? null;
  const periodEnd = periodEndTs ? new Date(periodEndTs * 1000).toISOString() : null;

  return NextResponse.json({
    last4: card.last4,
    brand: card.brand,
    pmId: pmList.data[0].id,
    periodEnd,
    hasExistingSubscription: activeSubs.data.length > 0,
  });
}
