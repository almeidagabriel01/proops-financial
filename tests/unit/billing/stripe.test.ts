import { describe, it, expect, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { handleStripeWebhook, isWithinGracePeriod } from '@/lib/billing/webhook-handler';

vi.mock('@/lib/billing/stripe', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/billing/stripe')>();
  return {
    ...original,
    getStripe: vi.fn().mockReturnValue({
      subscriptions: {
        retrieve: vi.fn().mockResolvedValue({
          id: 'sub_test',
          status: 'active',
          trial_end: null,
          items: { data: [{ price: { id: 'price_pro_monthly', recurring: { interval: 'month' } } }] },
        }),
      },
    }),
  };
});

// ---------------------------------------------------------------------------
// Supabase mock — chainable AND thenable (awaitable at any point in chain)
// ---------------------------------------------------------------------------
function makeChain(resolvedData: unknown = null) {
  const result = { data: resolvedData, error: null };

  // Thenable: awaiting the chain itself (or any method returning it) resolves to result
  const chain: Record<string, unknown> = {
    then: (
      onfulfilled?: (v: typeof result) => unknown,
      onrejected?: (e: unknown) => unknown,
    ) => Promise.resolve(result).then(onfulfilled, onrejected),
  };

  // All filter/mutation methods return the chain (chainable + thenable)
  chain.update = vi.fn().mockReturnValue(chain);
  chain.upsert = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.in = vi.fn().mockReturnValue(chain);
  chain.select = vi.fn().mockReturnValue(chain);
  // Terminal methods resolve directly
  chain.single = vi.fn().mockResolvedValue(result);
  chain.maybeSingle = vi.fn().mockResolvedValue(result);

  return chain;
}

function makeSupabase(profileData: unknown = { id: 'profile_1' }, subData: unknown = [{ id: 'sub_local_1' }]) {
  const profileChain = makeChain(profileData);
  const subChain = makeChain(subData);
  const supabase = {
    from: vi.fn().mockImplementation((table: string) => {
      if (table === 'profiles') return profileChain;
      return subChain;
    }),
    _profileChain: profileChain,
    _subChain: subChain,
  };
  return supabase as unknown as SupabaseClient & {
    _profileChain: ReturnType<typeof makeChain>;
    _subChain: ReturnType<typeof makeChain>;
  };
}

function makeEvent(type: string, object: unknown) {
  return { type, data: { object } } as Parameters<typeof handleStripeWebhook>[0];
}

// ---------------------------------------------------------------------------
// isWithinGracePeriod
// ---------------------------------------------------------------------------
describe('isWithinGracePeriod', () => {
  it('returns true when updatedAt is 1 day ago', () => {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    expect(isWithinGracePeriod(oneDayAgo)).toBe(true);
  });

  it('returns false when updatedAt is 4 days ago', () => {
    const fourDaysAgo = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString();
    expect(isWithinGracePeriod(fourDaysAgo)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// checkout.session.completed
// ---------------------------------------------------------------------------
describe('handleStripeWebhook — checkout.session.completed', () => {
  it('looks up profile by stripe_customer_id and upserts subscription', async () => {
    const supabase = makeSupabase({ id: 'profile_1' });
    const event = makeEvent('checkout.session.completed', {
      mode: 'subscription',
      customer: 'cus_test',
      subscription: 'sub_test',
      metadata: { billing_cycle: 'monthly' },
    });

    await handleStripeWebhook(event, supabase);

    expect(supabase.from).toHaveBeenCalledWith('profiles');
    expect(supabase._profileChain.eq).toHaveBeenCalledWith('stripe_customer_id', 'cus_test');
    expect(supabase.from).toHaveBeenCalledWith('subscriptions');
    expect(supabase._subChain.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'active', stripe_subscription_id: 'sub_test' }),
      expect.any(Object)
    );
  });

  it('resolves billing_cycle as annual when metadata says annual', async () => {
    const supabase = makeSupabase({ id: 'profile_1' });
    const event = makeEvent('checkout.session.completed', {
      mode: 'subscription',
      customer: 'cus_test',
      subscription: 'sub_annual',
      metadata: { billing_cycle: 'annual' },
    });

    await handleStripeWebhook(event, supabase);

    expect(supabase._subChain.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ billing_cycle: 'annual' }),
      expect.any(Object)
    );
  });

  it('skips non-subscription mode sessions', async () => {
    const supabase = makeSupabase();
    const event = makeEvent('checkout.session.completed', {
      mode: 'payment',
      customer: 'cus_test',
      subscription: null,
    });

    await handleStripeWebhook(event, supabase);

    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('warns and skips when no profile found for customer', async () => {
    const supabase = makeSupabase(null); // profile not found
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const event = makeEvent('checkout.session.completed', {
      mode: 'subscription',
      customer: 'cus_unknown',
      subscription: 'sub_test',
      metadata: {},
    });

    await handleStripeWebhook(event, supabase);

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('cus_unknown'));
    expect(supabase._subChain.upsert).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// customer.subscription.updated
// ---------------------------------------------------------------------------
describe('handleStripeWebhook — customer.subscription.updated', () => {
  it('updates subscription to active', async () => {
    const supabase = makeSupabase(null, [{ id: 'sub_local_1' }]);
    const event = makeEvent('customer.subscription.updated', {
      id: 'sub_stripe_1',
      status: 'active',
      items: { data: [{ price: { id: 'price_pro_monthly' }, current_period_start: 1700000000, current_period_end: 1702000000 }] },
    });

    await handleStripeWebhook(event, supabase);

    expect(supabase._subChain.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'active' })
    );
    expect(supabase._subChain.eq).toHaveBeenCalledWith('stripe_subscription_id', 'sub_stripe_1');
  });

  it('maps trialing Stripe status to trialing', async () => {
    const supabase = makeSupabase(null, [{ id: 'sub_local_1' }]);
    const event = makeEvent('customer.subscription.updated', {
      id: 'sub_stripe_2',
      status: 'trialing',
      trial_end: 1800000000,
      items: { data: [{ price: { id: 'price_pro_monthly' }, current_period_start: 1700000000, current_period_end: 1702000000 }] },
    });

    await handleStripeWebhook(event, supabase);

    expect(supabase._subChain.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'trialing' })
    );
  });

  it('maps past_due Stripe status to past_due', async () => {
    const supabase = makeSupabase(null, [{ id: 'sub_local_1' }]);
    const event = makeEvent('customer.subscription.updated', {
      id: 'sub_stripe_3',
      status: 'past_due',
      items: { data: [{ price: { id: 'price_pro_monthly' }, current_period_start: 1700000000, current_period_end: 1702000000 }] },
    });

    await handleStripeWebhook(event, supabase);

    expect(supabase._subChain.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'past_due' })
    );
  });
});

// ---------------------------------------------------------------------------
// customer.subscription.deleted
// ---------------------------------------------------------------------------
describe('handleStripeWebhook — customer.subscription.deleted', () => {
  it('sets subscription status to canceled', async () => {
    const supabase = makeSupabase(null, [{ id: 'sub_local_1' }]);
    const event = makeEvent('customer.subscription.deleted', {
      id: 'sub_stripe_4',
      status: 'canceled',
    });

    await handleStripeWebhook(event, supabase);

    expect(supabase._subChain.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'canceled' })
    );
    expect(supabase._subChain.eq).toHaveBeenCalledWith('stripe_subscription_id', 'sub_stripe_4');
  });
});

// ---------------------------------------------------------------------------
// invoice.payment_failed
// ---------------------------------------------------------------------------
describe('handleStripeWebhook — invoice.payment_failed', () => {
  it('sets subscription to past_due via parent.subscription_details', async () => {
    const supabase = makeSupabase(null, [{ id: 'sub_local_1' }]);
    const event = makeEvent('invoice.payment_failed', {
      id: 'inv_1',
      parent: { subscription_details: { subscription: 'sub_stripe_5' } },
    });

    await handleStripeWebhook(event, supabase);

    expect(supabase._subChain.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'past_due' })
    );
    expect(supabase._subChain.eq).toHaveBeenCalledWith('stripe_subscription_id', 'sub_stripe_5');
  });

  it('skips when invoice has no subscription reference', async () => {
    const supabase = makeSupabase();
    const event = makeEvent('invoice.payment_failed', {
      id: 'inv_2',
      parent: null,
    });

    await handleStripeWebhook(event, supabase);

    expect(supabase._subChain.update).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Unknown events
// ---------------------------------------------------------------------------
describe('handleStripeWebhook — unknown event', () => {
  it('ignores unknown event types without throwing', async () => {
    const supabase = makeSupabase();
    const event = makeEvent('charge.succeeded', { id: 'ch_1' });

    await expect(handleStripeWebhook(event, supabase)).resolves.toBeUndefined();
    expect(supabase.from).not.toHaveBeenCalled();
  });
});
