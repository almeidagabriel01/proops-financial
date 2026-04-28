import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { STRIPE_PRICE_IDS, type StripePlanKey } from '@/lib/billing/stripe';
import { PRO_PLAN_KEYS } from '@/lib/billing/plans';
import { createCheckoutSession } from '@/lib/billing/checkout';

// GET /checkout/redirect?plan=pro_monthly&intent=trial
// Server-side redirect to Stripe after email verification + signup intent
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const planKey = searchParams.get('plan') as StripePlanKey | null;
  const intent = searchParams.get('intent');

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  if (!planKey || !STRIPE_PRICE_IDS[planKey]) {
    return NextResponse.redirect(`${appUrl}/dashboard`);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(`${appUrl}/login`);
  }

  const withTrial = intent === 'trial' && (PRO_PLAN_KEYS as readonly string[]).includes(planKey);

  try {
    const checkoutUrl = await createCheckoutSession(user.id, user.email, planKey, withTrial);
    return NextResponse.redirect(checkoutUrl, 303);
  } catch (err) {
    console.error('[checkout/redirect] Failed:', err);
    return NextResponse.redirect(`${appUrl}/dashboard`);
  }
}
