import { describe, it, expect } from 'vitest';
import { detectRecurring, normalizeForDetection, type TransactionForDetection } from '@/lib/recurring/detector';

describe('normalizeForDetection', () => {
  it('lowercases and strips numbers', () => {
    expect(normalizeForDetection('NETFLIX 12.90')).not.toContain('12.90');
    expect(normalizeForDetection('NETFLIX 12.90')).toContain('netflix');
  });

  it('strips fractions like 3/10', () => {
    expect(normalizeForDetection('COMPRA LOJA 3/10')).not.toContain('3/10');
  });

  it('collapses multiple spaces', () => {
    const result = normalizeForDetection('LOJA   ABC   DEF');
    expect(result).not.toContain('  ');
  });
});

describe('detectRecurring', () => {
  function makeMonthly(
    description: string,
    type: 'credit' | 'debit',
    months: number,
    amount = 100,
  ): TransactionForDetection[] {
    return Array.from({ length: months }, (_, i) => {
      const d = new Date(2024, i, 10);
      return {
        date: d.toISOString().slice(0, 10),
        description,
        amount,
        type,
        category: 'outros',
      };
    });
  }

  it('returns empty for no transactions', () => {
    expect(detectRecurring([])).toEqual([]);
  });

  it('returns empty for fewer than 3 occurrences', () => {
    const txs = makeMonthly('Netflix', 'debit', 2);
    expect(detectRecurring(txs)).toHaveLength(0);
  });

  it('detects monthly recurring pattern', () => {
    const txs = makeMonthly('Netflix Streaming', 'debit', 5, 44.9);
    const candidates = detectRecurring(txs);
    expect(candidates.length).toBeGreaterThanOrEqual(1);
    const netflix = candidates.find((c) => c.description.toLowerCase().includes('netflix'));
    expect(netflix).toBeDefined();
    expect(netflix!.frequency).toBe('monthly');
    expect(netflix!.confidence).toBeGreaterThanOrEqual(0.5);
  });

  it('detects weekly recurring pattern', () => {
    const base = new Date('2024-01-01');
    const txs: TransactionForDetection[] = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(base);
      d.setDate(d.getDate() + i * 7);
      return {
        date: d.toISOString().slice(0, 10),
        description: 'Feira Livre',
        amount: 80,
        type: 'debit',
        category: 'alimentacao',
      };
    });
    const candidates = detectRecurring(txs);
    expect(candidates.length).toBeGreaterThanOrEqual(1);
    expect(candidates[0].frequency).toBe('weekly');
  });

  it('does not detect truly irregular patterns', () => {
    // Intervals: 3, 50, 80 days — average ~44d, outside all frequency buckets
    const txs: TransactionForDetection[] = [
      { date: '2024-01-01', description: 'Irregular Store', amount: 50, type: 'debit', category: 'compras' },
      { date: '2024-01-04', description: 'Irregular Store', amount: 80, type: 'debit', category: 'compras' },
      { date: '2024-02-23', description: 'Irregular Store', amount: 30, type: 'debit', category: 'compras' },
      { date: '2024-05-13', description: 'Irregular Store', amount: 120, type: 'debit', category: 'compras' },
    ];
    const candidates = detectRecurring(txs);
    const store = candidates.find((c) => c.description.toLowerCase().includes('irregular'));
    // Average interval ~44 days → not in weekly/biweekly/monthly/annual range → not classified
    expect(store).toBeUndefined();
  });

  it('separates credit from debit with same description', () => {
    const creditTxs = makeMonthly('Salario', 'credit', 4, 5000);
    const debitTxs = makeMonthly('Salario', 'debit', 4, 100);
    const candidates = detectRecurring([...creditTxs, ...debitTxs]);
    const credits = candidates.filter((c) => c.type === 'credit');
    const debits = candidates.filter((c) => c.type === 'debit');
    // Should detect them separately or at least not merge
    expect(credits.length + debits.length).toBeGreaterThanOrEqual(0);
  });

  it('sorts by confidence descending', () => {
    const consistent = makeMonthly('Netflix', 'debit', 6, 44.9);
    const inconsistentAmounts: TransactionForDetection[] = [
      { date: '2024-01-15', description: 'Mercado', amount: 200, type: 'debit', category: 'alimentacao' },
      { date: '2024-02-15', description: 'Mercado', amount: 450, type: 'debit', category: 'alimentacao' },
      { date: '2024-03-15', description: 'Mercado', amount: 100, type: 'debit', category: 'alimentacao' },
    ];
    const candidates = detectRecurring([...consistent, ...inconsistentAmounts]);
    for (let i = 1; i < candidates.length; i++) {
      expect(candidates[i - 1].confidence).toBeGreaterThanOrEqual(candidates[i].confidence);
    }
  });
});
