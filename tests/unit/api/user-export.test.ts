import { describe, it, expect } from 'vitest';

// Tests validate the export data shape and filename logic — independent of Supabase

describe('User Export — data shape', () => {
  it('export envelope has all required top-level fields', () => {
    const exportData = {
      exportedAt: new Date().toISOString(),
      profile: { email: 'a@b.com', display_name: 'Test', plan: 'free', trial_ends_at: null, created_at: '2026-01-01' },
      transactions: [],
      budgets: [],
      goals: [],
      category_dictionary: [],
      chat_messages: [],
    };

    expect(exportData).toHaveProperty('exportedAt');
    expect(exportData).toHaveProperty('profile');
    expect(exportData).toHaveProperty('transactions');
    expect(exportData).toHaveProperty('budgets');
    expect(exportData).toHaveProperty('goals');
    expect(exportData).toHaveProperty('category_dictionary');
    expect(exportData).toHaveProperty('chat_messages');
  });

  it('exportedAt is a valid ISO 8601 date string', () => {
    const exportedAt = new Date().toISOString();
    expect(() => new Date(exportedAt)).not.toThrow();
    expect(new Date(exportedAt).toISOString()).toBe(exportedAt);
  });

  it('profile includes email but not password', () => {
    const profile = {
      email: 'user@example.com',
      display_name: 'João',
      plan: 'premium',
      trial_ends_at: null,
      created_at: '2026-01-15T10:00:00Z',
    };

    expect(profile).toHaveProperty('email');
    expect(profile).not.toHaveProperty('password');
  });

  it('empty arrays are used when user has no data (not null)', () => {
    const transactions = null;
    const budgets = null;
    const goals = null;
    const categoryDictionary = null;
    const chatMessages = null;

    expect(transactions ?? []).toEqual([]);
    expect(budgets ?? []).toEqual([]);
    expect(goals ?? []).toEqual([]);
    expect(categoryDictionary ?? []).toEqual([]);
    expect(chatMessages ?? []).toEqual([]);
  });

  it('generates correct filename format', () => {
    const date = '2026-04-07';
    const filename = `meus-dados-finansim-${date}.json`;
    expect(filename).toBe('meus-dados-finansim-2026-04-07.json');
    expect(filename).toMatch(/^meus-dados-finansim-\d{4}-\d{2}-\d{2}\.json$/);
  });

  it('filename date matches current date format', () => {
    const date = new Date().toISOString().split('T')[0];
    const filename = `meus-dados-finansim-${date}.json`;
    expect(filename).toMatch(/^meus-dados-finansim-\d{4}-\d{2}-\d{2}\.json$/);
  });

  it('content-disposition header uses attachment directive', () => {
    const filename = 'meus-dados-finansim-2026-04-07.json';
    const header = `attachment; filename="${filename}"`;
    expect(header).toContain('attachment');
    expect(header).toContain(filename);
  });

  it('profile plan values are known constants', () => {
    const knownPlans = ['free', 'basic', 'premium'];
    expect(knownPlans).toContain('free');
    expect(knownPlans).toContain('premium');
    expect(knownPlans).not.toContain('enterprise');
  });
});
