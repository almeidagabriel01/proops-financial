import { timingSafeEqual, createHash } from 'crypto';
import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { createServiceClient } from '@/lib/supabase/server';
import { handleAsaasWebhook, type AsaasWebhookEvent } from '@/lib/billing/webhook-handler';

// POST /api/webhook/asaas
// Public route — no JWT auth; validated via static token in header asaas-access-token
// Asaas retries if response is not 2xx — always return 200 when token is valid
export async function POST(req: Request) {
  const token = req.headers.get('asaas-access-token');
  const expected = process.env.ASAAS_WEBHOOK_TOKEN;
  // Timing-safe comparison via SHA-256 hashing — prevents length-dependent timing leaks
  if (!token || !expected || !timingSafeEqual(
    createHash('sha256').update(token).digest(),
    createHash('sha256').update(expected).digest(),
  )) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const event = (await req.json()) as AsaasWebhookEvent;
    const supabase = await createServiceClient();
    await handleAsaasWebhook(event, supabase);
  } catch (err) {
    Sentry.captureException(err, {
      extra: { operation: 'asaas_webhook' },
    });
    // Still return 200 — Asaas retries on non-2xx, leading to duplicate processing
    console.error('[webhook/asaas] Unexpected error:', err);
  }

  return new NextResponse('OK', { status: 200 });
}
