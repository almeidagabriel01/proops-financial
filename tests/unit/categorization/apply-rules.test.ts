import { describe, it, expect } from 'vitest';
import { normalizeForRule, findMatchingRule, type CategorizationRule } from '@/lib/categorization/apply-rules';

// ---------------------------------------------------------------------------
// normalizeForRule
// ---------------------------------------------------------------------------
describe('normalizeForRule', () => {
  it('lowercases the input', () => {
    expect(normalizeForRule('NETFLIX')).toBe('netflix');
  });

  it('strips diacritics', () => {
    expect(normalizeForRule('Pão de Açúcar')).toBe('pao de acucar');
  });

  it('removes non-alphanumeric characters', () => {
    expect(normalizeForRule('Uber*Eats123!')).toBe('ubereats123');
  });

  it('collapses multiple spaces to single space', () => {
    expect(normalizeForRule('Mc   Donald   s')).toBe('mc donald s');
  });

  it('trims leading and trailing whitespace', () => {
    expect(normalizeForRule('  iFood  ')).toBe('ifood');
  });

  it('returns empty string for punctuation-only input', () => {
    expect(normalizeForRule('***')).toBe('');
  });

  it('handles mixed accents and symbols', () => {
    // & is non-alphanumeric → removed; \s+ collapses surrounding spaces
    expect(normalizeForRule('AÇAÍ & CIAS LTDA.')).toBe('acai cias ltda');
  });
});

// ---------------------------------------------------------------------------
// Helper builders
// ---------------------------------------------------------------------------
function makeRule(overrides: Partial<CategorizationRule> = {}): CategorizationRule {
  return {
    id: 'rule-1',
    pattern: 'netflix',
    match_type: 'contains',
    category: 'assinaturas',
    priority: 10,
    active: true,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// findMatchingRule — contains (default)
// ---------------------------------------------------------------------------
describe('findMatchingRule — contains', () => {
  it('matches when description contains pattern', () => {
    const rules = [makeRule({ pattern: 'netflix', match_type: 'contains' })];
    const result = findMatchingRule('Netflix Recorrente', rules);
    expect(result).not.toBeNull();
    expect(result!.category).toBe('assinaturas');
  });

  it('is case-insensitive (normalizes both sides)', () => {
    const rules = [makeRule({ pattern: 'NETFLIX', match_type: 'contains' })];
    expect(findMatchingRule('netflix mensal', rules)).not.toBeNull();
  });

  it('returns null when no pattern matches', () => {
    const rules = [makeRule({ pattern: 'netflix', match_type: 'contains' })];
    expect(findMatchingRule('Spotify Premium', rules)).toBeNull();
  });

  it('strips diacritics from both description and pattern', () => {
    const rules = [makeRule({ pattern: 'açúcar', match_type: 'contains', category: 'alimentacao' })];
    expect(findMatchingRule('Pao de Acucar SP', rules)).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// findMatchingRule — exact
// ---------------------------------------------------------------------------
describe('findMatchingRule — exact', () => {
  it('matches when normalized description equals normalized pattern', () => {
    const rules = [makeRule({ pattern: 'ifood', match_type: 'exact', category: 'delivery' })];
    expect(findMatchingRule('iFood', rules)).not.toBeNull();
  });

  it('does not match partial descriptions', () => {
    const rules = [makeRule({ pattern: 'ifood', match_type: 'exact', category: 'delivery' })];
    expect(findMatchingRule('iFood Pedido 123', rules)).toBeNull();
  });

  it('handles empty pattern matching empty description', () => {
    const rules = [makeRule({ pattern: '***', match_type: 'exact', category: 'outros' })];
    expect(findMatchingRule('***', rules)).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// findMatchingRule — starts_with
// ---------------------------------------------------------------------------
describe('findMatchingRule — starts_with', () => {
  it('matches when description starts with pattern', () => {
    const rules = [makeRule({ pattern: 'uber', match_type: 'starts_with', category: 'transporte' })];
    expect(findMatchingRule('Uber Corrida SP', rules)).not.toBeNull();
  });

  it('does not match when pattern appears in the middle', () => {
    const rules = [makeRule({ pattern: 'uber', match_type: 'starts_with', category: 'transporte' })];
    expect(findMatchingRule('Pagto Uber Corrida', rules)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// findMatchingRule — inactive rules
// ---------------------------------------------------------------------------
describe('findMatchingRule — inactive rules', () => {
  it('skips inactive rules', () => {
    const rules = [makeRule({ active: false })];
    expect(findMatchingRule('Netflix Recorrente', rules)).toBeNull();
  });

  it('uses first active rule when mixed active/inactive', () => {
    const rules = [
      makeRule({ id: 'r1', pattern: 'netflix', active: false, category: 'outros' }),
      makeRule({ id: 'r2', pattern: 'netflix', active: true, category: 'assinaturas' }),
    ];
    const result = findMatchingRule('Netflix', rules);
    expect(result?.category).toBe('assinaturas');
  });
});

// ---------------------------------------------------------------------------
// findMatchingRule — priority
// ---------------------------------------------------------------------------
describe('findMatchingRule — priority order', () => {
  it('returns first rule in array order (caller pre-sorts by priority DESC)', () => {
    const rules = [
      makeRule({ id: 'r1', pattern: 'netflix', category: 'assinaturas', priority: 20 }),
      makeRule({ id: 'r2', pattern: 'netflix', category: 'lazer', priority: 10 }),
    ];
    const result = findMatchingRule('Netflix', rules);
    expect(result?.id).toBe('r1');
  });
});

// ---------------------------------------------------------------------------
// findMatchingRule — empty inputs
// ---------------------------------------------------------------------------
describe('findMatchingRule — edge cases', () => {
  it('returns null for empty rules list', () => {
    expect(findMatchingRule('Netflix', [])).toBeNull();
  });

  it('returns null for empty description with no matching empty rule', () => {
    const rules = [makeRule({ pattern: 'netflix', match_type: 'contains' })];
    expect(findMatchingRule('', rules)).toBeNull();
  });
});
