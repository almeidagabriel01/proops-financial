import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { handleAsaasWebhook, type AsaasWebhookEvent } from '@/lib/billing/webhook-handler';

// POST /api/webhook/asaas
// Public route — no JWT auth; validated via static token in header asaas-access-token
// Asaas retries if response is not 2xx — always return 200 when token is valid
export async function POST(req: Request) {
  const token = req.headers.get('asaas-access-token');
  if (!token || token !== process.env.ASAAS_WEBHOOK_TOKEN) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const event = (await req.json()) as AsaasWebhookEvent;
  const supabase = await createServiceClient();
  await handleAsaasWebhook(event, supabase);

  return new NextResponse('OK', { status: 200 });
}
