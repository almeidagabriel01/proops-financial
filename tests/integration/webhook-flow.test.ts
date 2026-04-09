import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import { handleAsaasWebhook } from '@/lib/billing/webhook-handler';
import type { Database } from '@/lib/supabase/types';

/**
 * Integration tests for the Asaas webhook flow.
 * Requires TEST_SUPABASE_URL + TEST_SUPABASE_SERVICE_ROLE_KEY.
 * Skip automatically when staging credentials are not available.
 */

const TEST_URL = process.env.TEST_SUPABASE_URL;
const TEST_KEY = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY;
const hasCredentials = Boolean(TEST_URL && TEST_KEY);

describe.skipIf(!hasCredentials)('Webhook Flow — Integration (staging Supabase)', () => {
  let supabase: SupabaseClient<Database>;
  let testUserId: string;
  const asaasCustomerId = `cus_test_${randomUUID().slice(0, 8)}`;
  const asaasSubscriptionId = `sub_test_${randomUUID().slice(0, 8)}`;

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

    // Set asaas_customer_id on profile
    await supabase
      .from('profiles')
      .update({ asaas_customer_id: asaasCustomerId, onboarding_completed: true })
      .eq('id', testUserId);

    // Create subscription row
    await supabase.from('subscriptions').upsert({
      user_id: testUserId,
      asaas_subscription_id: asaasSubscriptionId,
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

  it('PAYMENT_CONFIRMED ativa plano pro no perfil', async () => {
    const event = {
      event: 'PAYMENT_CONFIRMED' as const,
      payment: {
        id: 'pay_001',
        subscription: asaasSubscriptionId,
        customer: asaasCustomerId,
        status: 'CONFIRMED',
        dueDate: '2025-02-01',
      },
    };

    await handleAsaasWebhook(event, supabase);

    const { data: profile } = await supabase
      .from('profiles')
      .select('plan')
      .eq('id', testUserId)
      .single();

    expect(profile?.plan).toBe('pro');
  });

  it('PAYMENT_OVERDUE aplica período de graça (mantém pro)', async () => {
    const event = {
      event: 'PAYMENT_OVERDUE' as const,
      payment: {
        id: 'pay_002',
        subscription: asaasSubscriptionId,
        customer: asaasCustomerId,
        status: 'OVERDUE',
      },
    };

    await handleAsaasWebhook(event, supabase);

    const { data: profile } = await supabase
      .from('profiles')
      .select('plan')
      .eq('id', testUserId)
      .single();

    // Within grace period — plan stays pro
    expect(profile?.plan).toBe('pro');
  });

  it('SUBSCRIPTION_CANCELED revoga plano (volta para basic)', async () => {
    const event = {
      event: 'SUBSCRIPTION_CANCELED' as const,
      subscription: {
        id: asaasSubscriptionId,
        customer: asaasCustomerId,
        status: 'CANCELED',
      },
    };

    await handleAsaasWebhook(event, supabase);

    const { data: profile } = await supabase
      .from('profiles')
      .select('plan')
      .eq('id', testUserId)
      .single();

    expect(profile?.plan).toBe('basic');
  });
});
