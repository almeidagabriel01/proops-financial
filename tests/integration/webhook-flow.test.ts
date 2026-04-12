import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import { handleStripeWebhook } from '@/lib/billing/webhook-handler';
import type Stripe from 'stripe';
import type { Database } from '@/lib/supabase/types';

/**
 * Integration tests for the Stripe webhook flow.
 * Requires TEST_SUPABASE_URL + TEST_SUPABASE_SERVICE_ROLE_KEY.
 * Skip automatically when staging credentials are not available.
 */

const TEST_URL = process.env.TEST_SUPABASE_URL;
const TEST_KEY = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY;
const hasCredentials = Boolean(TEST_URL && TEST_KEY);

function makeStripeEvent(type: string, object: unknown): Stripe.Event {
  return { type, data: { object } } as Stripe.Event;
}

describe.skipIf(!hasCredentials)('Webhook Flow — Integration (staging Supabase)', () => {
  let supabase: SupabaseClient<Database>;
  let testUserId: string;
  const stripeCustomerId = `cus_test_${randomUUID().slice(0, 8)}`;
  const stripeSubscriptionId = `sub_test_${randomUUID().slice(0, 8)}`;

  beforeAll(async () => {
    supabase = createClient<Database>(TEST_URL!, TEST_KEY!);

    const runId = randomUUID().slice(0, 8);
    const email = `webhook-${runId}@test.finansim.app`;
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password: 'Test@1234!',
      email_confirm: true,
    });

    if (error || !data.user) throw new Error(`Test user creation failed: ${error?.message}`);
    testUserId = data.user.id;

    // Set stripe_customer_id on profile
    await supabase
      .from('profiles')
      .update({ stripe_customer_id: stripeCustomerId, onboarding_completed: true })
      .eq('id', testUserId);

    // Create subscription row
    await supabase.from('subscriptions').upsert({
      user_id: testUserId,
      stripe_subscription_id: stripeSubscriptionId,
      billing_cycle: 'monthly',
      status: 'pending',
    });
  });

  afterAll(async () => {
    if (!testUserId) return;
    await supabase.from('subscriptions').delete().eq('user_id', testUserId);
    await supabase.from('transactions').delete().eq('user_id', testUserId);
    await supabase.auth.admin.deleteUser(testUserId);
  });

  it('checkout.session.completed ativa a assinatura', async () => {
    const event = makeStripeEvent('checkout.session.completed', {
      mode: 'subscription',
      customer: stripeCustomerId,
      subscription: stripeSubscriptionId,
      metadata: { billing_cycle: 'monthly' },
    });

    await handleStripeWebhook(event, supabase);

    const { data: sub } = await supabase
      .from('subscriptions')
      .select('status')
      .eq('stripe_subscription_id', stripeSubscriptionId)
      .single();

    expect(sub?.status).toBe('active');
  });

  it('invoice.payment_failed aplica status past_due', async () => {
    const event = makeStripeEvent('invoice.payment_failed', {
      id: 'inv_001',
      parent: { subscription_details: { subscription: stripeSubscriptionId } },
    });

    await handleStripeWebhook(event, supabase);

    const { data: sub } = await supabase
      .from('subscriptions')
      .select('status')
      .eq('stripe_subscription_id', stripeSubscriptionId)
      .single();

    expect(sub?.status).toBe('past_due');
  });

  it('customer.subscription.deleted cancela a assinatura', async () => {
    const event = makeStripeEvent('customer.subscription.deleted', {
      id: stripeSubscriptionId,
      status: 'canceled',
    });

    await handleStripeWebhook(event, supabase);

    const { data: sub } = await supabase
      .from('subscriptions')
      .select('status')
      .eq('stripe_subscription_id', stripeSubscriptionId)
      .single();

    expect(sub?.status).toBe('canceled');
  });
});
