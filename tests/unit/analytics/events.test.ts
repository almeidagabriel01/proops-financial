import { describe, it, expect, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  trackEvent,
  trackImportCompleted,
  trackChatMessageSent,
  trackTrialStarted,
  trackSubscriptionCreated,
  trackOnboardingCompleted,
} from '@/lib/analytics/events';

// Mock Supabase client — analytics must fire-and-forget (never throw)
function makeMockClient(shouldReject = false) {
  const insert = vi.fn().mockReturnValue({
    then: (cb: () => void) => ({ catch: (errCb: () => void) => {
      if (shouldReject) errCb();
      else cb();
      return {};
    }}),
  });
  return {
    from: vi.fn().mockReturnValue({ insert }),
    _insert: insert,
  } as unknown as SupabaseClient & { _insert: ReturnType<typeof vi.fn> };
}

describe('trackEvent — base function', () => {
  it('calls supabase.from(analytics_events).insert() with correct shape', () => {
    const client = makeMockClient();
    trackEvent(client, 'user-123', 'test_event', { key: 'value' });

    expect(client.from).toHaveBeenCalledWith('analytics_events');
    expect((client as ReturnType<typeof makeMockClient>)._insert).toHaveBeenCalledWith({
      user_id: 'user-123',
      event_name: 'test_event',
      properties: { key: 'value' },
    });
  });

  it('defaults properties to empty object when not provided', () => {
    const client = makeMockClient();
    trackEvent(client, 'user-123', 'no_props_event');

    expect((client as ReturnType<typeof makeMockClient>)._insert).toHaveBeenCalledWith({
      user_id: 'user-123',
      event_name: 'no_props_event',
      properties: {},
    });
  });

  it('does not throw when Supabase insert fails (fire-and-forget)', () => {
    const client = makeMockClient(true); // will reject
    expect(() => trackEvent(client, 'user-123', 'fail_event')).not.toThrow();
  });

  it('returns void (fire-and-forget — caller does not await)', () => {
    const client = makeMockClient();
    const result = trackEvent(client, 'user-123', 'void_event');
    expect(result).toBeUndefined();
  });
});

describe('trackImportCompleted', () => {
  it('inserts import_completed event with correct properties', () => {
    const client = makeMockClient();
    trackImportCompleted(client, 'user-123', {
      file_format: 'ofx',
      transaction_count: 42,
      duration_ms: 1500,
    });

    expect((client as ReturnType<typeof makeMockClient>)._insert).toHaveBeenCalledWith({
      user_id: 'user-123',
      event_name: 'import_completed',
      properties: { file_format: 'ofx', transaction_count: 42, duration_ms: 1500 },
    });
  });

  it('accepts csv as file_format', () => {
    const client = makeMockClient();
    trackImportCompleted(client, 'user-123', {
      file_format: 'csv',
      transaction_count: 10,
      duration_ms: 800,
    });
    expect((client as ReturnType<typeof makeMockClient>)._insert).toHaveBeenCalledWith(
      expect.objectContaining({ properties: expect.objectContaining({ file_format: 'csv' }) }),
    );
  });
});

describe('trackChatMessageSent', () => {
  it('inserts chat_message_sent with plan, model and query count', () => {
    const client = makeMockClient();
    trackChatMessageSent(client, 'user-123', {
      plan: 'premium',
      model: 'claude-sonnet-4-6',
      query_count_after: 5,
    });

    expect((client as ReturnType<typeof makeMockClient>)._insert).toHaveBeenCalledWith({
      user_id: 'user-123',
      event_name: 'chat_message_sent',
      properties: { plan: 'premium', model: 'claude-sonnet-4-6', query_count_after: 5 },
    });
  });
});

describe('trackTrialStarted', () => {
  it('inserts trial_started with plan: pro', () => {
    const client = makeMockClient();
    trackTrialStarted(client, 'user-123');

    expect((client as ReturnType<typeof makeMockClient>)._insert).toHaveBeenCalledWith({
      user_id: 'user-123',
      event_name: 'trial_started',
      properties: { plan: 'pro' },
    });
  });
});

describe('trackSubscriptionCreated', () => {
  it('inserts subscription_created with plan and billing_cycle', () => {
    const client = makeMockClient();
    trackSubscriptionCreated(client, 'user-123', {
      plan: 'pro',
      billing_cycle: 'monthly',
    });

    expect((client as ReturnType<typeof makeMockClient>)._insert).toHaveBeenCalledWith({
      user_id: 'user-123',
      event_name: 'subscription_created',
      properties: { plan: 'pro', billing_cycle: 'monthly' },
    });
  });
});

describe('trackOnboardingCompleted', () => {
  it('inserts onboarding_completed with skipped: false', () => {
    const client = makeMockClient();
    trackOnboardingCompleted(client, 'user-123', { skipped: false });

    expect((client as ReturnType<typeof makeMockClient>)._insert).toHaveBeenCalledWith({
      user_id: 'user-123',
      event_name: 'onboarding_completed',
      properties: { skipped: false },
    });
  });

  it('inserts onboarding_completed with skipped: true', () => {
    const client = makeMockClient();
    trackOnboardingCompleted(client, 'user-123', { skipped: true });

    expect((client as ReturnType<typeof makeMockClient>)._insert).toHaveBeenCalledWith(
      expect.objectContaining({ properties: { skipped: true } }),
    );
  });
});
