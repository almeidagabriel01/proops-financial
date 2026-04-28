import { NextResponse } from 'next/server';

import { createServiceClient } from '@/lib/supabase/server';
import { getStripe } from '@/lib/billing/stripe';
import { handleStripeWebhook } from '@/lib/billing/webhook-handler';

// POST /api/webhook/stripe
// Public route — no JWT auth; validated via Stripe signature in stripe-signature header
export async function POST(req: Request) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature');
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !secret) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  let event;
  try {
    event = getStripe().webhooks.constructEvent(body, sig, secret);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid signature';
    return new NextResponse(`Webhook signature verification failed: ${message}`, { status: 400 });
  }

  try {
    const supabase = await createServiceClient();
    await handleStripeWebhook(event, supabase);
  } catch (err) {
    console.error('[webhook/stripe] Unhandled error processing event:', event.type, err);
    // Return 500 so Stripe retries the event (operations are upsert-safe)
    return new NextResponse('Internal Server Error', { status: 500 });
  }

  return new NextResponse('OK', { status: 200 });
}
