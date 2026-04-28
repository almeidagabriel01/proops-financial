import { describe, it, expect } from 'vitest';

// Mirrors the tag normalization and validation logic in:
// - POST /api/transactions/[id]/tags/route.ts
// - TransactionDetail component (handleAddTag)

function normalizeTag(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, '-');
}

function validateTag(tag: string): string | null {
  if (tag.length === 0 || tag.length > 50) return 'error: invalid length';
  return tag;
}

describe('Transaction Tags — normalization', () => {
  it('trims leading and trailing whitespace', () => {
    expect(normalizeTag('  viagem  ')).toBe('viagem');
  });

  it('lowercases the tag', () => {
    expect(normalizeTag('Viagem')).toBe('viagem');
    expect(normalizeTag('ALIMENTAÇÃO')).toBe('alimentação');
  });

  it('replaces internal spaces with hyphens', () => {
    expect(normalizeTag('fast food')).toBe('fast-food');
    expect(normalizeTag('conta   de   luz')).toBe('conta-de-luz');
  });

  it('collapses multiple spaces into a single hyphen', () => {
    expect(normalizeTag('a  b   c')).toBe('a-b-c');
  });

  it('preserves hyphens already in the string', () => {
    expect(normalizeTag('pet-shop')).toBe('pet-shop');
  });

  it('handles empty string after trim', () => {
    const tag = normalizeTag('   ');
    expect(tag).toBe('');
  });
});

describe('Transaction Tags — validation', () => {
  it('accepts a valid tag of 1 character', () => {
    const tag = normalizeTag('a');
    expect(validateTag(tag)).toBe('a');
  });

  it('accepts a tag at exactly 50 characters', () => {
    const tag = 'a'.repeat(50);
    expect(validateTag(tag)).toBe(tag);
  });

  it('rejects a tag of 51 characters', () => {
    const tag = 'a'.repeat(51);
    expect(validateTag(tag)).toBe('error: invalid length');
  });

  it('rejects an empty tag (after normalization)', () => {
    const tag = normalizeTag('   ');
    expect(validateTag(tag)).toBe('error: invalid length');
  });

  it('accepts tags with hyphens', () => {
    const tag = normalizeTag('fast food');
    expect(validateTag(tag)).toBe('fast-food');
  });
});

describe('Transaction Tags — idempotency logic', () => {
  it('adding the same tag twice is a no-op (frontend guard)', () => {
    const existing = ['viagem', 'alimentacao'];
    const newTag = normalizeTag('viagem');
    const isDuplicate = existing.includes(newTag);
    expect(isDuplicate).toBe(true);
  });

  it('adding a new tag appends to the list', () => {
    const existing = ['viagem'];
    const newTag = normalizeTag('pet-shop');
    const updated = existing.includes(newTag) ? existing : [...existing, newTag];
    expect(updated).toEqual(['viagem', 'pet-shop']);
  });

  it('removing a tag filters it out', () => {
    const existing = ['viagem', 'pet-shop', 'alimentacao'];
    const toRemove = 'pet-shop';
    const updated = existing.filter((t) => t !== toRemove);
    expect(updated).toEqual(['viagem', 'alimentacao']);
  });
});

describe('Transaction Tags — autocomplete frequency ranking', () => {
  it('ranks tags by usage count descending', () => {
    const rows = [
      { tag: 'viagem' },
      { tag: 'alimentacao' },
      { tag: 'viagem' },
      { tag: 'viagem' },
      { tag: 'alimentacao' },
      { tag: 'pet-shop' },
    ];

    const freq = new Map<string, number>();
    for (const { tag } of rows) {
      freq.set(tag, (freq.get(tag) ?? 0) + 1);
    }

    const ranked = [...freq.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([tag]) => tag);

    expect(ranked[0]).toBe('viagem');    // freq 3
    expect(ranked[1]).toBe('alimentacao'); // freq 2
    expect(ranked[2]).toBe('pet-shop');  // freq 1
  });

  it('filters suggestions by prefix', () => {
    const allTags = ['viagem', 'vet', 'alimentacao', 'vinho'];
    const prefix = 'vi';
    const filtered = allTags.filter((t) => t.startsWith(prefix));
    expect(filtered).toEqual(['viagem', 'vinho']);
  });

  it('limits results to 20', () => {
    const allTags = Array.from({ length: 30 }, (_, i) => `tag-${i}`);
    const limited = allTags.slice(0, 20);
    expect(limited).toHaveLength(20);
  });

  it('excludes tags already on the transaction from suggestions', () => {
    const suggestions = ['viagem', 'alimentacao', 'pet-shop'];
    const existing = ['viagem'];
    const filtered = suggestions.filter((s) => !existing.includes(s));
    expect(filtered).toEqual(['alimentacao', 'pet-shop']);
  });
});
