import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('lib/billing/stripe — getStripe factory', () => {
  let originalKey: string | undefined;

  beforeEach(() => {
    originalKey = process.env.STRIPE_SECRET_KEY;
    // Reset module to clear singleton between tests
    vi.resetModules();
  });

  afterEach(() => {
    if (originalKey !== undefined) {
      process.env.STRIPE_SECRET_KEY = originalKey;
    } else {
      delete process.env.STRIPE_SECRET_KEY;
    }
  });

  it('throws when STRIPE_SECRET_KEY is not set', async () => {
    delete process.env.STRIPE_SECRET_KEY;
    const { getStripe } = await import('@/lib/billing/stripe');
    expect(() => getStripe()).toThrow('STRIPE_SECRET_KEY is not set');
  });

  it('returns a Stripe instance when STRIPE_SECRET_KEY is set', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_fake_key_for_testing';
    const { getStripe } = await import('@/lib/billing/stripe');
    const stripe = getStripe();
    expect(stripe).toBeDefined();
    expect(typeof stripe.customers).toBe('object');
  });

  it('returns the same instance on subsequent calls (singleton)', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_fake_key_for_testing';
    const { getStripe } = await import('@/lib/billing/stripe');
    const a = getStripe();
    const b = getStripe();
    expect(a).toBe(b);
  });

  it('STRIPE_PRICE_IDS exports defined keys', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_fake';
    const { STRIPE_PRICE_IDS } = await import('@/lib/billing/stripe');
    expect(STRIPE_PRICE_IDS).toHaveProperty('basic_monthly');
    expect(STRIPE_PRICE_IDS).toHaveProperty('basic_annual');
    expect(STRIPE_PRICE_IDS).toHaveProperty('pro_monthly');
    expect(STRIPE_PRICE_IDS).toHaveProperty('pro_annual');
  });
});
