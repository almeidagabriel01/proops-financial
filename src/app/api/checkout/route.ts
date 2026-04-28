import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { STRIPE_PRICE_IDS, type StripePlanKey } from '@/lib/billing/stripe';
import { PRO_PLAN_KEYS } from '@/lib/billing/plans';
import { createCheckoutSession } from '@/lib/billing/checkout';

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json() as { planKey?: string; withTrial?: boolean };
  const planKey = body.planKey as StripePlanKey | undefined;

  if (!planKey || !STRIPE_PRICE_IDS[planKey]) {
    return NextResponse.json({ error: 'Invalid planKey' }, { status: 400 });
  }

  const withTrial = body.withTrial === true;
  if (withTrial && !(PRO_PLAN_KEYS as readonly string[]).includes(planKey)) {
    return NextResponse.json({ error: 'Trial only available for Pro plans' }, { status: 400 });
  }

  try {
    const checkoutUrl = await createCheckoutSession(user.id, user.email, planKey, withTrial);
    return NextResponse.json({ checkoutUrl });
  } catch (err) {
    console.error('[checkout] Failed to create session:', err);
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
  }
}
