// Stripe server-side client and price ID map
// Authentication: STRIPE_SECRET_KEY (server-only — never expose to client)

import Stripe from 'stripe';

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error('STRIPE_SECRET_KEY is not set');
    _stripe = new Stripe(key, { typescript: true });
  }
  return _stripe;
}

// Price IDs are configured per environment via env vars
// Create prices at: dashboard.stripe.com/products
export const STRIPE_PRICE_IDS = {
  basic_monthly: process.env.STRIPE_BASIC_MONTHLY_PRICE_ID!,
  basic_annual: process.env.STRIPE_BASIC_ANNUAL_PRICE_ID!,
  pro_monthly: process.env.STRIPE_PRO_MONTHLY_PRICE_ID!,
  pro_annual: process.env.STRIPE_PRO_ANNUAL_PRICE_ID!,
} as const;

export type StripePlanKey = keyof typeof STRIPE_PRICE_IDS;
