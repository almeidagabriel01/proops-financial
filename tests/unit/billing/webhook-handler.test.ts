import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  handleAsaasWebhook,
  isWithinGracePeriod,
  type AsaasWebhookEvent,
} from '@/lib/billing/webhook-handler';

// Minimal Supabase mock
function makeSupabase(updateError: { message: string } | null = null) {
  const updateFn = vi.fn().mockResolvedValue({ error: updateError });
  const eqStatus = vi.fn().mockReturnValue({ error: updateError, then: (r: (v: { error: typeof updateError }) => void) => r({ error: updateError }) });

  const chain = {
    update: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: updateError }),
    }),
  };

  return {
    from: vi.fn().mockReturnValue(chain),
    _chain: chain,
    _updateFn: updateFn,
    _eqStatus: eqStatus,
  };
}

// Helper to call and capture the update chain
function makeSupabaseCapture() {
  const updateArgs: Record<string, unknown>[] = [];
  let eqArgs: string[] = [];

  const supabase = {
    from: vi.fn().mockReturnValue({
      update: vi.fn().mockImplementation((args: Record<string, unknown>) => {
        updateArgs.push(args);
        return {
          eq: vi.fn().mockImplementation((...a: string[]) => {
            eqArgs = a;
            return Promise.resolve({ error: null });
          }),
        };
      }),
    }),
    _getUpdateArgs: () => updateArgs,
    _getEqArgs: () => eqArgs,
  };

  return supabase;
}

describe('isWithinGracePeriod', () => {
  it('returns true when updated less than 3 days ago', () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    expect(isWithinGracePeriod(twoHoursAgo)).toBe(true);
  });

  it('returns true at exactly 2 days ago', () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
    expect(isWithinGracePeriod(twoDaysAgo)).toBe(true);
  });

  it('returns false when updated more than 3 days ago', () => {
    const fourDaysAgo = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString();
    expect(isWithinGracePeriod(fourDaysAgo)).toBe(false);
  });

  it('returns false at exactly 3 days + 1ms', () => {
    const justOver3Days = new Date(Date.now() - (3 * 24 * 60 * 60 * 1000 + 1)).toISOString();
    expect(isWithinGracePeriod(justOver3Days)).toBe(false);
  });
});

describe('handleAsaasWebhook', () => {
  it('PAYMENT_CONFIRMED sets status active', async () => {
    const supabase = makeSupabaseCapture();
    const event: AsaasWebhookEvent = {
      event: 'PAYMENT_CONFIRMED',
      subscription: { id: 'sub_123', customer: 'cus_abc', status: 'ACTIVE' },
    };

    await handleAsaasWebhook(event, supabase as never);

    expect(supabase.from).toHaveBeenCalledWith('subscriptions');
    const updateCall = (supabase.from('subscriptions').update as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(updateCall.status).toBe('active');
  });

  it('PAYMENT_RECEIVED also sets status active', async () => {
    const supabase = makeSupabaseCapture();
    const event: AsaasWebhookEvent = {
      event: 'PAYMENT_RECEIVED',
      payment: { id: 'pay_1', subscription: 'sub_123', customer: 'cus_abc', status: 'CONFIRMED' },
    };

    await handleAsaasWebhook(event, supabase as never);

    const updateCall = (supabase.from('subscriptions').update as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(updateCall.status).toBe('active');
  });

  it('PAYMENT_OVERDUE sets status past_due (grace period)', async () => {
    const supabase = makeSupabaseCapture();
    const event: AsaasWebhookEvent = {
      event: 'PAYMENT_OVERDUE',
      subscription: { id: 'sub_123', customer: 'cus_abc', status: 'OVERDUE' },
    };

    await handleAsaasWebhook(event, supabase as never);

    const updateCall = (supabase.from('subscriptions').update as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(updateCall.status).toBe('past_due');
  });

  it('SUBSCRIPTION_CANCELED sets status canceled', async () => {
    const supabase = makeSupabaseCapture();
    const event: AsaasWebhookEvent = {
      event: 'SUBSCRIPTION_CANCELED',
      subscription: { id: 'sub_123', customer: 'cus_abc', status: 'CANCELED' },
    };

    await handleAsaasWebhook(event, supabase as never);

    const updateCall = (supabase.from('subscriptions').update as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(updateCall.status).toBe('canceled');
  });

  it('PAYMENT_DELETED also sets status canceled', async () => {
    const supabase = makeSupabaseCapture();
    const event: AsaasWebhookEvent = {
      event: 'PAYMENT_DELETED',
      payment: { id: 'pay_1', subscription: 'sub_123', customer: 'cus_abc', status: 'DELETED' },
    };

    await handleAsaasWebhook(event, supabase as never);

    const updateCall = (supabase.from('subscriptions').update as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(updateCall.status).toBe('canceled');
  });

  it('ignores event with no subscription reference', async () => {
    const supabase = makeSupabaseCapture();
    const event: AsaasWebhookEvent = {
      event: 'PAYMENT_CONFIRMED',
      // no subscription, no payment.subscription
      payment: { id: 'pay_1', customer: 'cus_abc', status: 'CONFIRMED' },
    };

    await handleAsaasWebhook(event, supabase as never);

    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('ignores unknown event type without throwing', async () => {
    const supabase = makeSupabaseCapture();
    const event: AsaasWebhookEvent = {
      event: 'UNKNOWN_EVENT',
      subscription: { id: 'sub_123', customer: 'cus_abc', status: 'ACTIVE' },
    };

    // Should not throw and should not call DB
    await expect(handleAsaasWebhook(event, supabase as never)).resolves.toBeUndefined();
    expect(supabase.from).not.toHaveBeenCalled();
  });
});
