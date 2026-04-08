import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Fire-and-forget analytics event tracking.
 * Never throws — analytics must never block or break the main request flow.
 * Must be called server-side only (avoids ad-blockers).
 */
export function trackEvent(
  supabaseAdmin: SupabaseClient,
  userId: string,
  eventName: string,
  properties: Record<string, unknown> = {},
): void {
  // Two-argument .then() handles both resolve and reject (Supabase returns PromiseLike, not Promise)
  void supabaseAdmin
    .from('analytics_events')
    .insert({ user_id: userId, event_name: eventName, properties })
    .then(() => {}, () => {});
}

// ── Typed event helpers ────────────────────────────────────────────────────

export function trackImportCompleted(
  supabaseAdmin: SupabaseClient,
  userId: string,
  props: { file_format: 'ofx' | 'csv'; transaction_count: number; duration_ms: number },
): void {
  trackEvent(supabaseAdmin, userId, 'import_completed', props);
}

export function trackChatMessageSent(
  supabaseAdmin: SupabaseClient,
  userId: string,
  props: { plan: string; model: string; query_count_after: number },
): void {
  trackEvent(supabaseAdmin, userId, 'chat_message_sent', props);
}

export function trackTrialStarted(
  supabaseAdmin: SupabaseClient,
  userId: string,
): void {
  trackEvent(supabaseAdmin, userId, 'trial_started', { plan: 'pro' });
}

export function trackSubscriptionCreated(
  supabaseAdmin: SupabaseClient,
  userId: string,
  props: { plan: string; billing_cycle: string },
): void {
  trackEvent(supabaseAdmin, userId, 'subscription_created', props);
}

export function trackOnboardingCompleted(
  supabaseAdmin: SupabaseClient,
  userId: string,
  props: { skipped: boolean },
): void {
  trackEvent(supabaseAdmin, userId, 'onboarding_completed', props);
}
