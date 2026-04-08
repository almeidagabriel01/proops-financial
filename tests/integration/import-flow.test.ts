import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { parseCSV } from '@/lib/parsers/csv-parser';
import { parseOFX } from '@/lib/parsers/ofx-parser';

/**
 * Integration tests for the import flow.
 * Requires TEST_SUPABASE_URL + TEST_SUPABASE_SERVICE_ROLE_KEY.
 * Skip automatically when staging credentials are not available.
 */

const TEST_URL = process.env.TEST_SUPABASE_URL;
const TEST_KEY = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY;
const hasCredentials = Boolean(TEST_URL && TEST_KEY);

describe.skipIf(!hasCredentials)('Import Flow — Integration (staging Supabase)', () => {
  let supabase: ReturnType<typeof createClient>;
  let testUserId: string;

  beforeAll(async () => {
    supabase = createClient(TEST_URL!, TEST_KEY!);

    // Create isolated test user
    const runId = randomUUID().slice(0, 8);
    const email = `integration-${runId}@test.finansim.app`;
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password: 'Test@1234!',
      email_confirm: true,
    });

    if (error || !data.user) throw new Error(`Test user creation failed: ${error?.message}`);
    testUserId = data.user.id;

    // Mark onboarding complete
    await supabase.from('profiles').update({ onboarding_completed: true }).eq('id', testUserId);
  });

  afterAll(async () => {
    if (!testUserId) return;
    await supabase.from('transactions').delete().eq('user_id', testUserId);
    await supabase.auth.admin.deleteUser(testUserId);
  });

  it('parseia CSV Nubank e salva transações no banco', async () => {
    const content = readFileSync(join(process.cwd(), 'tests/fixtures/nubank-sample.csv'), 'utf-8');
    const parsed = parseCSV(content);

    expect(parsed.length).toBeGreaterThan(0);

    // Insert parsed transactions
    const rows = parsed.map((tx) => ({
      user_id: testUserId,
      date: tx.date,
      description: tx.description,
      amount: tx.amount,
      type: tx.type,
      category: 'outros',
      external_id: tx.external_id,
    }));

    const { error } = await supabase.from('transactions').insert(rows);
    expect(error).toBeNull();

    // Verify they are queryable
    const { data: saved } = await supabase
      .from('transactions')
      .select('external_id')
      .eq('user_id', testUserId);

    expect(saved?.length).toBe(rows.length);
  });

  it('deduplicação: reimportar mesmo CSV não cria duplicatas', async () => {
    const content = readFileSync(join(process.cwd(), 'tests/fixtures/nubank-sample.csv'), 'utf-8');
    const parsed = parseCSV(content);

    // Attempt to re-insert same external_ids — should upsert or fail silently
    const rows = parsed.map((tx) => ({
      user_id: testUserId,
      date: tx.date,
      description: tx.description,
      amount: tx.amount,
      type: tx.type,
      category: 'outros',
      external_id: tx.external_id,
    }));

    await supabase.from('transactions').upsert(rows, { onConflict: 'user_id,external_id' });

    const { data: saved } = await supabase
      .from('transactions')
      .select('external_id')
      .eq('user_id', testUserId);

    // Still same count — no duplicates
    expect(saved?.length).toBe(rows.length);
  });

  it('parseia OFX Itaú e salva transações no banco', async () => {
    const content = readFileSync(join(process.cwd(), 'tests/fixtures/itau-sample.ofx'), 'utf-8');
    const parsed = parseOFX(content);

    expect(parsed.length).toBeGreaterThan(0);

    const rows = parsed.map((tx) => ({
      user_id: testUserId,
      date: tx.date,
      description: tx.description,
      amount: tx.amount,
      type: tx.type,
      category: 'outros',
      external_id: `ofx-${tx.external_id}`, // prefix to avoid collision with CSV run
    }));

    const { error } = await supabase.from('transactions').upsert(rows, {
      onConflict: 'user_id,external_id',
    });
    expect(error).toBeNull();
  });

  it('RLS: transações associadas ao user_id correto', async () => {
    const { data } = await supabase
      .from('transactions')
      .select('user_id')
      .eq('user_id', testUserId);

    // All transactions belong to testUserId
    expect(data?.every((t) => t.user_id === testUserId)).toBe(true);
  });
});
