import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

// Uses staging Supabase (TEST_SUPABASE_* env vars) — no Docker needed
const supabaseAdmin = createClient(
  process.env.TEST_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
  process.env.TEST_SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
);

export interface TestUser {
  id: string;
  email: string;
  password: string;
}

/**
 * Creates an isolated test user for the E2E run.
 * Email uses a UUID suffix to ensure isolation across concurrent runs.
 */
export async function createTestUser(): Promise<TestUser> {
  const runId = randomUUID().slice(0, 8);
  const email = `e2e-${runId}@test.finansim.app`;
  const password = 'Test@1234!';

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: 'E2E Test User' },
  });

  if (error || !data.user) {
    throw new Error(`Failed to create test user: ${error?.message}`);
  }

  // Mark onboarding as completed so E2E tests don't hit the onboarding redirect
  await supabaseAdmin.from('profiles').update({ onboarding_completed: true }).eq('id', data.user.id);

  return { id: data.user.id, email, password };
}

/**
 * Seeds a test user with sample transactions for dashboard/chat tests.
 */
export async function seedTestTransactions(userId: string): Promise<void> {
  const transactions = [
    {
      user_id: userId,
      date: '2025-01-10',
      description: 'Salário Empresa XYZ',
      amount: 5000,
      type: 'credit',
      category: 'salario',
      external_id: `e2e-${userId}-sal`,
    },
    {
      user_id: userId,
      date: '2025-01-15',
      description: 'Supermercado Extra',
      amount: -350,
      type: 'debit',
      category: 'alimentacao',
      external_id: `e2e-${userId}-mkt`,
    },
    {
      user_id: userId,
      date: '2025-01-20',
      description: 'Uber',
      amount: -45,
      type: 'debit',
      category: 'transporte',
      external_id: `e2e-${userId}-uber`,
    },
  ];

  await supabaseAdmin.from('transactions').insert(transactions);
}

/**
 * Removes all data for the test user (cleanup after test run).
 */
export async function deleteTestUser(userId: string): Promise<void> {
  // RLS bypass via service role — delete in dependency order
  await supabaseAdmin.from('transactions').delete().eq('user_id', userId);
  await supabaseAdmin.from('analytics_events').delete().eq('user_id', userId);
  await supabaseAdmin.auth.admin.deleteUser(userId);
}
