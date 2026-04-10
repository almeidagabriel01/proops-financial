import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { createServiceClient } from '@/lib/supabase/server';
import { getStripe } from '@/lib/billing/stripe';
import { handleStripeWebhook } from '@/lib/billing/webhook-handler';

// POST /api/webhook/stripe
// Public route — no JWT auth; validated via Stripe signature in stripe-signature header
// Stripe retries on non-2xx — always return 200 when signature is valid
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
    Sentry.captureException(err, {
      extra: { operation: 'stripe_webhook', eventType: event.type },
    });
    // Still return 200 — Stripe retries on non-2xx, leading to duplicate processing
    console.error('[webhook/stripe] Unexpected error:', err);
  }

  return new NextResponse('OK', { status: 200 });
}
