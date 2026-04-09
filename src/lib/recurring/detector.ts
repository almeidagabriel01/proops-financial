/**
 * Recurring transaction detector.
 * Analyzes a list of transactions and identifies patterns that look like
 * recurring expenses or incomes (weekly, biweekly, monthly, annual).
 */

export interface TransactionForDetection {
  date: string;        // YYYY-MM-DD
  description: string;
  amount: number;      // absolute value (positive)
  type: 'credit' | 'debit';
  category: string;
}

export interface RecurringCandidate {
  description: string;           // most recent description seen
  normalizedDescription: string; // cleaned version used for grouping
  amount: number;                // average amount (rounded to cents)
  type: 'credit' | 'debit';
  category: string;
  frequency: 'weekly' | 'biweekly' | 'monthly' | 'annual';
  confidence: number;            // 0.0 – 1.0
  occurrences: number;
  avgIntervalDays: number;
  lastDate: string;
  suggestedNextDate: string;
}

/** Normalize description for grouping: strip numbers, special chars, collapse spaces. */
export function normalizeForDetection(description: string): string {
  return description
    .toLowerCase()
    .replace(/\d{4}-\d{2}-\d{2}/g, '')   // strip ISO dates
    .replace(/\b\d+\/\d+\b/g, '')         // strip fractions like 3/10
    .replace(/\b\d+[.,]\d{2}\b/g, '')     // strip currency-like amounts
    .replace(/\b\d+\b/g, '')              // strip standalone numbers
    .replace(/[^a-záàâãéêíóôõúüç\s]/gi, '') // keep only letters
    .replace(/\s+/g, ' ')
    .trim();
}

type FrequencyResult = {
  frequency: 'weekly' | 'biweekly' | 'monthly' | 'annual';
  targetDays: number;
};

function classifyFrequency(avgDays: number): FrequencyResult | null {
  if (avgDays >= 5 && avgDays <= 9)    return { frequency: 'weekly',   targetDays: 7 };
  if (avgDays >= 12 && avgDays <= 16)  return { frequency: 'biweekly', targetDays: 14 };
  if (avgDays >= 25 && avgDays <= 35)  return { frequency: 'monthly',  targetDays: 30 };
  if (avgDays >= 340 && avgDays <= 390) return { frequency: 'annual',  targetDays: 365 };
  return null;
}

function stddev(values: number[]): number {
  const avg = values.reduce((s, v) => s + v, 0) / values.length;
  const variance = values.reduce((s, v) => s + (v - avg) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function computeConfidence(
  sorted: TransactionForDetection[],
  intervals: number[],
  targetDays: number,
): number {
  // Interval consistency: low stddev relative to target = high score
  const intervalSd = stddev(intervals);
  const intervalScore = Math.max(0, 1 - intervalSd / targetDays);

  // Amount consistency
  const amounts = sorted.map((t) => t.amount);
  const avgAmount = amounts.reduce((s, v) => s + v, 0) / amounts.length;
  const amountSd = stddev(amounts);
  const amountScore = avgAmount > 0 ? Math.max(0, 1 - amountSd / avgAmount) : 0;

  // More occurrences → higher confidence (cap at 6)
  const occurrenceScore = Math.min(1, sorted.length / 6);

  return intervalScore * 0.5 + amountScore * 0.3 + occurrenceScore * 0.2;
}

function addDaysStr(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Detect recurring patterns in a list of transactions.
 *
 * @param transactions - flat list, sorted or unsorted, any date range
 * @returns candidates sorted by confidence descending (>= 0.5 confidence only)
 */
export function detectRecurring(
  transactions: TransactionForDetection[],
): RecurringCandidate[] {
  if (transactions.length === 0) return [];

  // Group by (normalized description + type)
  const groups = new Map<string, TransactionForDetection[]>();
  for (const t of transactions) {
    const key = `${normalizeForDetection(t.description)}__${t.type}`;
    if (!key.startsWith('__')) {
      const bucket = groups.get(key) ?? [];
      bucket.push(t);
      groups.set(key, bucket);
    }
  }

  const candidates: RecurringCandidate[] = [];

  for (const [key, group] of groups) {
    if (group.length < 3) continue;

    // Sort by date ascending
    const sorted = [...group].sort((a, b) => a.date.localeCompare(b.date));

    // Build interval array (in days)
    const intervals: number[] = [];
    for (let i = 1; i < sorted.length; i++) {
      const ms1 = new Date(sorted[i - 1].date + 'T12:00:00Z').getTime();
      const ms2 = new Date(sorted[i].date + 'T12:00:00Z').getTime();
      intervals.push((ms2 - ms1) / 86_400_000);
    }

    const avgInterval = intervals.reduce((s, v) => s + v, 0) / intervals.length;
    const classified = classifyFrequency(avgInterval);
    if (!classified) continue;

    const confidence = computeConfidence(sorted, intervals, classified.targetDays);
    if (confidence < 0.5) continue;

    const avgAmount =
      Math.round((group.reduce((s, t) => s + t.amount, 0) / group.length) * 100) / 100;

    const lastDate = sorted[sorted.length - 1].date;
    const today = new Date().toISOString().slice(0, 10);
    let suggestedNext = addDaysStr(lastDate, classified.targetDays);
    while (suggestedNext < today) {
      suggestedNext = addDaysStr(suggestedNext, classified.targetDays);
    }

    candidates.push({
      description: sorted[sorted.length - 1].description,
      normalizedDescription: key.split('__')[0],
      amount: avgAmount,
      type: group[0].type,
      category: sorted[sorted.length - 1].category,
      frequency: classified.frequency,
      confidence: Math.round(confidence * 100) / 100,
      occurrences: group.length,
      avgIntervalDays: Math.round(avgInterval),
      lastDate,
      suggestedNextDate: suggestedNext,
    });
  }

  return candidates.sort((a, b) => b.confidence - a.confidence);
}
