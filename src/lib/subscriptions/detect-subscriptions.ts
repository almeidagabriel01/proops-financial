import type { SupabaseClient } from '@supabase/supabase-js';

// ── Normalization ─────────────────────────────────────────────────────────────

/** Normalize a transaction description for subscription grouping. */
function normalizeForSubscription(desc: string): string {
  return desc
    .toLowerCase()
    .replace(/\d+\/\d+/g, '')              // remove installment markers: "1/12", "3/6"
    .replace(/\d{2}\/\d{2}\/\d{4}/g, '')   // remove Brazilian dates: "15/03/2024"
    .replace(/\d{2}\/\d{2}\/\d{2}/g, '')   // remove short dates: "15/03/24"
    .replace(/compra (no )?debito\s*/gi, '') // remove bank prefixes
    .replace(/pagamento\s+/gi, '')
    .replace(/\bpix\b/gi, '')
    .replace(/\btef\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Generate a human-readable display name from a normalized description. */
function toDisplayName(normalized: string): string {
  return normalized
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
    .slice(0, 80); // cap length
}

// ── Interval helpers ──────────────────────────────────────────────────────────

function daysBetween(a: Date, b: Date): number {
  return Math.round(Math.abs(b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

function isMonthly(avgDays: number): boolean {
  return avgDays >= 20 && avgDays <= 40;
}

function isAnnual(avgDays: number): boolean {
  return avgDays >= 330 && avgDays <= 400;
}

function amountSimilar(a: number, b: number): boolean {
  return Math.abs(a - b) / Math.max(a, b) <= 0.05;
}

// ── Detection algorithm ───────────────────────────────────────────────────────

type TxRow = {
  id: string;
  description: string;
  amount: number;
  date: string;
  installment_group_id: string | null;
};

type DetectedSub = {
  description_normalized: string;
  display_name: string;
  current_amount: number;
  previous_amount: number | null;
  frequency: 'monthly' | 'annual';
  last_occurrence_date: string;
  occurrence_count: number;
  price_change_detected: boolean;
};

function analyzeGroup(normalized: string, txs: TxRow[]): DetectedSub | null {
  if (txs.length < 2) return null;

  // Reject if any transaction belongs to an installment group (mj1)
  if (txs.some((t) => t.installment_group_id !== null)) return null;

  // Sort by date ascending
  const sorted = [...txs].sort((a, b) => a.date.localeCompare(b.date));
  const amounts = sorted.map((t) => Math.abs(t.amount));

  // Calculate average interval between consecutive occurrences
  const intervals: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    intervals.push(daysBetween(new Date(sorted[i - 1].date), new Date(sorted[i].date)));
  }
  const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;

  const frequency: 'monthly' | 'annual' | null = isMonthly(avgInterval)
    ? 'monthly'
    : isAnnual(avgInterval)
    ? 'annual'
    : null;

  if (!frequency) return null;

  // Check that most amounts are similar (allow one reajuste)
  const baseAmount = amounts[0];
  const similarCount = amounts.filter((a) => amountSimilar(a, baseAmount)).length;
  if (similarCount < Math.ceil(amounts.length * 0.6)) return null;

  const currentAmount = amounts[amounts.length - 1];
  const previousAmount = amounts.length >= 2 ? amounts[amounts.length - 2] : null;
  const priceChangeDetected =
    previousAmount !== null && Math.abs(currentAmount - previousAmount) / Math.max(currentAmount, previousAmount) > 0.02;

  return {
    description_normalized: normalized,
    display_name: toDisplayName(normalized),
    current_amount: currentAmount,
    previous_amount: previousAmount ?? null,
    frequency,
    last_occurrence_date: sorted[sorted.length - 1].date,
    occurrence_count: sorted.length,
    price_change_detected: priceChangeDetected,
  };
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Analyze last 180 days of debit transactions and upsert detected subscriptions.
 * Safe to call fire-and-forget — errors are logged, never thrown.
 * SupabaseClient without generics defaults to <any> — allows querying tables
 * not yet present in generated types (detected_subscriptions, migration 023).
 */
export async function detectSubscriptions(
  supabase: SupabaseClient,
  userId: string,
): Promise<void> {
  try {
    const since = new Date();
    since.setDate(since.getDate() - 180);

    const { data: txData, error: txError } = await supabase
      .from('transactions')
      .select('id, description, amount, date, installment_group_id')
      .eq('user_id', userId)
      .eq('type', 'debit')
      .gte('date', since.toISOString().slice(0, 10))
      .order('date', { ascending: true });

    if (txError || !txData) {
      console.error('[detectSubscriptions] fetch error:', txError);
      return;
    }

    const txs = txData as TxRow[];
    if (txs.length < 2) return;

    // Group by normalized description
    const groups = new Map<string, TxRow[]>();
    for (const tx of txs) {
      const key = normalizeForSubscription(tx.description);
      if (!key || key.length < 2) continue;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(tx);
    }

    const detected: DetectedSub[] = [];
    for (const [normalized, group] of groups) {
      const result = analyzeGroup(normalized, group);
      if (result) detected.push(result);
    }

    if (detected.length === 0) return;

    // Upsert each detected subscription
    // On conflict: preserve dismissed_at (user choice), shift amounts (mn1)
    for (const sub of detected) {
      const { error: upsertError } = await supabase
        .from('detected_subscriptions')
        .upsert(
          {
            user_id: userId,
            description_normalized: sub.description_normalized,
            display_name: sub.display_name,
            current_amount: sub.current_amount,
            previous_amount: sub.previous_amount,
            frequency: sub.frequency,
            last_occurrence_date: sub.last_occurrence_date,
            occurrence_count: sub.occurrence_count,
            price_change_detected: sub.price_change_detected,
          },
          {
            onConflict: 'user_id,description_normalized',
            ignoreDuplicates: false,
          },
        );

      if (upsertError) {
        console.error('[detectSubscriptions] upsert error for', sub.description_normalized, upsertError);
      }
    }

    console.log(`[detectSubscriptions] upserted ${detected.length} subscriptions for user ${userId}`);
  } catch (err) {
    console.error('[detectSubscriptions] unexpected error:', err);
  }
}
