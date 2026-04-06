// Batch categorization engine (Tier 3 — Claude Haiku)
// Handles transactions not resolved by Tier 1 (user dictionary) or
// Tier 2 (global cache). One Haiku call for the entire remaining batch.
// arch section 5.1, 5.2

import Anthropic from '@anthropic-ai/sdk';
import type { SupabaseClient } from '@supabase/supabase-js';
import { CATEGORIZE_SYSTEM, CATEGORIZE_USER, VALID_CATEGORIES } from './prompts/categorize';

const CONFIDENCE_THRESHOLD = 0.7;
const CHUNK_SIZE = 100;

// Description normalization (mirrors SQL normalize_description() function)
// Used to produce lookup keys consistent with category_cache and category_dictionary
export function normalizeDescription(raw: string): string {
  return raw
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export interface TransactionForCategorization {
  id: string;
  description: string;
  amount: number;
}

export interface CategorizationResult {
  transactionId: string;
  category: string;
  confidence: number;
}

// Calls Claude Haiku with all transactions in a single batch request.
// Validates each result: invalid category or confidence < threshold → 'outros'.
// Saves results to category_cache for future reuse.
export async function categorizeBatch(
  supabase: SupabaseClient,
  transactions: TransactionForCategorization[],
): Promise<Map<string, CategorizationResult>> {
  const results = new Map<string, CategorizationResult>();

  if (transactions.length === 0) return results;

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const payload = transactions.map((t) => ({
    id: t.id,
    description: t.description,
    amount: t.amount,
  }));

  let rawResponse: string;
  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      messages: [{ role: 'user', content: CATEGORIZE_USER(payload) }],
      system: CATEGORIZE_SYSTEM,
    });

    const textBlock = response.content.find((b) => b.type === 'text');
    rawResponse = textBlock?.text ?? '[]';
  } catch (err) {
    console.error('[categorizer] Haiku API call failed:', err);
    // Fallback: mark all as 'outros'
    for (const t of transactions) {
      results.set(t.id, { transactionId: t.id, category: 'outros', confidence: 0 });
    }
    return results;
  }

  // Parse and validate response
  let parsed: { id: string; category: string; confidence: number }[];
  try {
    // Strip potential markdown code fences
    const json = rawResponse.replace(/^```json?\n?|```$/gm, '').trim();
    parsed = JSON.parse(json);
  } catch {
    console.error('[categorizer] Failed to parse Haiku response:', rawResponse);
    for (const t of transactions) {
      results.set(t.id, { transactionId: t.id, category: 'outros', confidence: 0 });
    }
    return results;
  }

  // Build lookup by id
  const parsedMap = new Map(parsed.map((p) => [p.id, p]));

  const cacheUpserts: { description_normalized: string; category: string; confidence: number }[] = [];

  for (const t of transactions) {
    const hit = parsedMap.get(t.id);
    const confidence = hit?.confidence ?? 0;
    const rawCategory = hit?.category ?? 'outros';
    const category =
      VALID_CATEGORIES.has(rawCategory) && confidence >= CONFIDENCE_THRESHOLD ? rawCategory : 'outros';

    results.set(t.id, { transactionId: t.id, category, confidence });

    // Prepare cache upsert (only for valid, confident results)
    if (VALID_CATEGORIES.has(rawCategory) && confidence >= CONFIDENCE_THRESHOLD) {
      cacheUpserts.push({
        description_normalized: normalizeDescription(t.description),
        category,
        confidence,
      });
    }
  }

  // Save to category_cache (fire-and-forget)
  if (cacheUpserts.length > 0) {
    supabase
      .from('category_cache')
      .upsert(cacheUpserts, { onConflict: 'description_normalized', ignoreDuplicates: false })
      .then(({ error }) => {
        if (error) console.error('[categorizer] cache upsert error:', error);
      });
  }

  return results;
}

export interface TransactionUpdate {
  id: string;
  category: string;
  categorySource: 'ai' | 'user' | 'cache';
  categoryConfidence?: number;
}

// Batch-updates transactions with categorization results.
// Processes in chunks of CHUNK_SIZE to avoid Supabase request limits.
export async function saveCategorizations(
  supabase: SupabaseClient,
  updates: TransactionUpdate[],
): Promise<void> {
  if (updates.length === 0) return;

  const chunks: TransactionUpdate[][] = [];
  for (let i = 0; i < updates.length; i += CHUNK_SIZE) {
    chunks.push(updates.slice(i, i + CHUNK_SIZE));
  }

  await Promise.all(
    chunks.map(async (chunk) => {
      await Promise.all(
        chunk.map(async (u) => {
          const { error } = await supabase
            .from('transactions')
            .update({
              category: u.category,
              category_source: u.categorySource,
              category_confidence: u.categoryConfidence ?? null,
            })
            .eq('id', u.id);

          if (error) {
            console.error('[categorizer] saveCategorizations update error for tx', u.id, error);
          }
        }),
      );
    }),
  );
}
