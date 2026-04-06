// ─────────────────────────────────────────────────────────────────────────────
// AI Categorization Cache — Two-Tier Lookup
//
// This module implements the first two tiers of the 3-tier categorization
// hierarchy (arch section 5.1). Both tiers avoid calling Claude Haiku when
// a category is already known.
//
// ┌─────────────────────────────────────────────────────────────────────────┐
// │ TIER 1 — category_dictionary (user-specific rules)                      │
// │                                                                         │
// │ Table: public.category_dictionary                                       │
// │ Purpose: Stores corrections the user made manually. If the user once    │
// │ said "PIX JOAO" is "transferencias", every future occurrence gets the   │
// │ same category without any AI call.                                      │
// │ Priority: HIGHEST — user intent always overrides AI and global cache.   │
// └─────────────────────────────────────────────────────────────────────────┘
//
// ┌─────────────────────────────────────────────────────────────────────────┐
// │ TIER 2 — category_cache (global cross-user cache)                       │
// │                                                                         │
// │ Table: public.category_cache                                            │
// │ Purpose: Caches AI results from ANY user. When user A imports "UBER"    │
// │ and the AI categorizes it as "transporte", user B importing "UBER"      │
// │ later gets the same category instantly — no API call.                   │
// │ Priority: Second — used only when Tier 1 has no match.                  │
// └─────────────────────────────────────────────────────────────────────────┘
// ─────────────────────────────────────────────────────────────────────────────

import type { SupabaseClient } from '@supabase/supabase-js';

export interface TransactionInput {
  id: string;
  description: string;
  normalizedDescription: string;
}

export interface CacheResult {
  transactionId: string;
  category: string;
  source: 'user' | 'cache';
  confidence?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Tier 1 — category_dictionary
// Looks up user-specific correction rules by normalized description pattern.
// Also increments usage_count for matched rules (learning signal).
// ─────────────────────────────────────────────────────────────────────────────

export async function lookupUserDictionary(
  supabase: SupabaseClient,
  userId: string,
  transactions: TransactionInput[],
): Promise<Map<string, CacheResult>> {
  const results = new Map<string, CacheResult>();

  if (transactions.length === 0) return results;

  const normalizedDescriptions = transactions.map((t) => t.normalizedDescription);

  const { data, error } = await supabase
    .from('category_dictionary')
    .select('description_pattern, category')
    .eq('user_id', userId)
    .in('description_pattern', normalizedDescriptions);

  if (error) {
    console.error('[cache] Tier 1 lookup error:', error);
    return results;
  }

  if (!data || data.length === 0) return results;

  const dictMap = new Map(data.map((row) => [row.description_pattern, row.category]));

  for (const tx of transactions) {
    const category = dictMap.get(tx.normalizedDescription);
    if (category) {
      results.set(tx.id, {
        transactionId: tx.id,
        category,
        source: 'user',
      });
    }
  }

  return results;
}

// ─────────────────────────────────────────────────────────────────────────────
// Tier 2 — category_cache
// Looks up AI results previously cached from any user (cross-user cache).
// Also increments hit_count to track cache popularity.
// ─────────────────────────────────────────────────────────────────────────────

export async function lookupGlobalCache(
  supabase: SupabaseClient,
  transactions: TransactionInput[],
): Promise<Map<string, CacheResult>> {
  const results = new Map<string, CacheResult>();

  if (transactions.length === 0) return results;

  const normalizedDescriptions = transactions.map((t) => t.normalizedDescription);

  const { data, error } = await supabase
    .from('category_cache')
    .select('description_normalized, category, confidence')
    .in('description_normalized', normalizedDescriptions);

  if (error) {
    console.error('[cache] Tier 2 lookup error:', error);
    return results;
  }

  if (!data || data.length === 0) return results;

  const cacheMap = new Map(
    data.map((row) => [row.description_normalized, { category: row.category, confidence: row.confidence }]),
  );

  for (const tx of transactions) {
    const hit = cacheMap.get(tx.normalizedDescription);
    if (hit) {
      results.set(tx.id, {
        transactionId: tx.id,
        category: hit.category,
        source: 'cache',
        confidence: hit.confidence ?? undefined,
      });
    }
  }

  return results;
}
