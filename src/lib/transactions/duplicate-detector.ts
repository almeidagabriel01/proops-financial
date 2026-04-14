import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Normalizes a transaction description for duplicate matching.
 * Strips punctuation, collapses spaces, uppercases — matches AC2 spec.
 */
export function normalizeDescription(desc: string): string {
  return desc
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Detects possible duplicate charges among newly imported transactions.
 *
 * Algorithm:
 * - Only checks debit transactions
 * - Matches: same normalized description + same amount + date within ±3 days
 * - Inserts pairs into duplicate_alerts (idempotent — conflicts ignored)
 * - Returns the number of new alerts created
 */
export async function detectDuplicates(
  supabase: SupabaseClient,
  userId: string,
  newTransactionIds: string[],
): Promise<number> {
  if (newTransactionIds.length === 0) return 0;

  // Fetch only debit transactions from the new import batch
  const { data: newTxns, error: fetchError } = await supabase
    .from('transactions')
    .select('id, description, amount, type, date')
    .in('id', newTransactionIds)
    .eq('type', 'debit');

  if (fetchError) {
    console.error('[detectDuplicates] fetch new txns error:', fetchError);
    return 0;
  }

  if (!newTxns || newTxns.length === 0) return 0;

  let alertsCreated = 0;

  for (const txn of newTxns) {
    const normalized = normalizeDescription(txn.description);

    const dateObj = new Date(txn.date + 'T12:00:00Z');
    const dateMinus3 = new Date(dateObj);
    dateMinus3.setUTCDate(dateMinus3.getUTCDate() - 3);
    const datePlus3 = new Date(dateObj);
    datePlus3.setUTCDate(datePlus3.getUTCDate() + 3);

    const { data: candidates, error: candidateError } = await supabase
      .from('transactions')
      .select('id, description, amount, date')
      .eq('user_id', userId)
      .eq('type', 'debit')
      .eq('amount', txn.amount)
      .neq('id', txn.id)
      .gte('date', dateMinus3.toISOString().slice(0, 10))
      .lte('date', datePlus3.toISOString().slice(0, 10));

    if (candidateError) {
      console.error('[detectDuplicates] candidate fetch error:', candidateError);
      continue;
    }

    for (const candidate of candidates ?? []) {
      if (normalizeDescription(candidate.description) !== normalized) continue;

      // Sort IDs to enforce transaction_id_1 < transaction_id_2 (matches CHECK constraint)
      const [id1, id2] = [txn.id, candidate.id].sort();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).from('duplicate_alerts').upsert(
        { user_id: userId, transaction_id_1: id1, transaction_id_2: id2, status: 'pending' },
        { onConflict: 'transaction_id_1,transaction_id_2', ignoreDuplicates: true },
      );

      if (error) {
        console.error('[detectDuplicates] insert alert error:', error);
      } else {
        alertsCreated++;
      }
    }
  }

  return alertsCreated;
}
