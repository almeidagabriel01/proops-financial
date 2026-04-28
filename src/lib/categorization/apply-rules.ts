/**
 * Rule matching logic for categorization_rules (Tier 0).
 * Mirrors the same logic in supabase/functions/categorize-import/index.ts.
 * Used server-side in Next.js API routes.
 */

export type MatchType = 'contains' | 'exact' | 'starts_with';

export type CategorizationRule = {
  id: string;
  pattern: string;
  match_type: MatchType;
  category: string;
  priority: number;
  active: boolean;
};

/** Normalize a description the same way as the Edge Function and SQL trigger */
export function normalizeForRule(raw: string): string {
  return raw
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Returns the first matching rule for a description, or null if none match.
 * Rules must be pre-sorted by priority DESC (caller's responsibility).
 */
export function findMatchingRule(
  description: string,
  rules: CategorizationRule[],
): CategorizationRule | null {
  const normalized = normalizeForRule(description);

  for (const rule of rules) {
    if (!rule.active) continue;
    const pat = normalizeForRule(rule.pattern);

    let matched = false;
    if (rule.match_type === 'exact') {
      matched = normalized === pat;
    } else if (rule.match_type === 'starts_with') {
      matched = normalized.startsWith(pat);
    } else {
      matched = normalized.includes(pat); // contains (default)
    }

    if (matched) return rule;
  }

  return null;
}
