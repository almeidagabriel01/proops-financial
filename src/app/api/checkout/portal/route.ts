import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { getStripe } from '@/lib/billing/stripe';
import { getAppUrl } from '@/lib/utils/app-url';

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

  let stripeCustomerId = (profile?.stripe_customer_id as string | null) ?? null;
  const stripe = getStripe();

  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { supabase_user_id: user.id },
    });
    stripeCustomerId = customer.id;
    await serviceSupabase
      .from('profiles')
      .update({ stripe_customer_id: stripeCustomerId })
      .eq('id', user.id);
  }

  const appUrl = getAppUrl();
  const session = await stripe.billingPortal.sessions.create({
    customer: stripeCustomerId,
    return_url: `${appUrl}/settings?tab=plano`,
  });

  return NextResponse.json({ url: session.url });
}
