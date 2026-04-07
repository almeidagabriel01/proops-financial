// Category correction helpers — used by TransactionDetail component (client-side with RLS)
// These functions use the browser Supabase client so RLS is enforced automatically.
// Never use service role for user-initiated corrections.

import type { SupabaseClient } from '@supabase/supabase-js';
import { normalizeDescription } from '@/lib/utils/format';

export interface CorrectionParams {
  userId: string;
  transactionIds: string[];
  description: string;
  newCategory: string;
}

// Updates transactions + upserts category_dictionary.
// Works for both single-transaction and batch corrections.
export async function saveCorrection(
  supabase: SupabaseClient,
  params: CorrectionParams,
): Promise<void> {
  const { userId, transactionIds, description, newCategory } = params;

  // 1. Update transactions (RLS ensures user can only touch their own rows)
  const { error: txError } = await supabase
    .from('transactions')
    .update({ category: newCategory, category_source: 'user' })
    .in('id', transactionIds);

  if (txError) throw txError;

  // 2. Upsert into category_dictionary so future imports skip the AI tier
  const { error: dictError } = await supabase
    .from('category_dictionary')
    .upsert(
      {
        user_id: userId,
        description_pattern: normalizeDescription(description),
        category: newCategory,
        usage_count: 1,
      },
      { onConflict: 'user_id,description_pattern' },
    );

  if (dictError) throw dictError;
}

// Finds IDs of other user transactions whose description normalizes to the same pattern.
// Returns empty array on error (non-blocking: batch option simply won't appear).
export async function findSameDescriptionIds(
  supabase: SupabaseClient,
  userId: string,
  description: string,
  excludeId: string,
): Promise<string[]> {
  const { data, error } = await supabase
    .from('transactions')
    .select('id, description')
    .eq('user_id', userId)
    .neq('id', excludeId);

  if (error) {
    console.error('[category-correction] findSameDescriptionIds error:', error);
    return [];
  }

  const pattern = normalizeDescription(description);
  return (data ?? [])
    .filter((t) => normalizeDescription(t.description) === pattern)
    .map((t) => t.id);
}
