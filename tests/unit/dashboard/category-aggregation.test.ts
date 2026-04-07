import { describe, it, expect } from 'vitest';
import {
  aggregateByCategory,
  calcTrend,
  buildCategoryBreakdown,
} from '@/lib/utils/category-aggregation';

// ── aggregateByCategory ───────────────────────────────────────────────────────

describe('aggregateByCategory', () => {
  it('aggregates debit transactions by category', () => {
    const txs = [
      { category: 'alimentacao', amount: 100, type: 'debit' },
      { category: 'alimentacao', amount: 50, type: 'debit' },
      { category: 'transporte', amount: 30, type: 'debit' },
    ];

    const result = aggregateByCategory(txs);

    const alimentacao = result.find((r) => r.category === 'alimentacao');
    expect(alimentacao?.total).toBe(150);
    expect(alimentacao?.count).toBe(2);

    const transporte = result.find((r) => r.category === 'transporte');
    expect(transporte?.total).toBe(30);
    expect(transporte?.count).toBe(1);
  });

  it('ignores credit transactions', () => {
    const txs = [
      { category: 'salario', amount: 5000, type: 'credit' },
      { category: 'alimentacao', amount: 100, type: 'debit' },
    ];

    const result = aggregateByCategory(txs);

    expect(result).toHaveLength(1);
    expect(result[0].category).toBe('alimentacao');
  });

  it('uses absolute value for negative amounts', () => {
    const txs = [{ category: 'transporte', amount: -50, type: 'debit' }];
    const result = aggregateByCategory(txs);
    expect(result[0].total).toBe(50);
  });

  it('calculates percentages that reflect distribution', () => {
    const txs = [
      { category: 'alimentacao', amount: 200, type: 'debit' },
      { category: 'transporte', amount: 100, type: 'debit' },
      { category: 'lazer', amount: 100, type: 'debit' },
    ];

    const result = aggregateByCategory(txs);
    const alimentacao = result.find((r) => r.category === 'alimentacao');
    expect(alimentacao?.percentage).toBe(50);
  });

  it('returns empty array for empty input', () => {
    expect(aggregateByCategory([])).toEqual([]);
  });

  it('returns empty array when all transactions are credits', () => {
    const txs = [{ category: 'salario', amount: 5000, type: 'credit' }];
    expect(aggregateByCategory(txs)).toEqual([]);
  });

  it('defaults null category to "outros"', () => {
    const txs = [{ category: null, amount: 50, type: 'debit' }];
    const result = aggregateByCategory(txs);
    expect(result[0].category).toBe('outros');
  });

  it('sorts by total descending', () => {
    const txs = [
      { category: 'lazer', amount: 50, type: 'debit' },
      { category: 'alimentacao', amount: 200, type: 'debit' },
      { category: 'transporte', amount: 100, type: 'debit' },
    ];

    const result = aggregateByCategory(txs);
    expect(result[0].category).toBe('alimentacao');
    expect(result[1].category).toBe('transporte');
    expect(result[2].category).toBe('lazer');
  });
});

// ── calcTrend ─────────────────────────────────────────────────────────────────

describe('calcTrend', () => {
  it('returns up when current is more than 5% above prev', () => {
    const result = calcTrend(110, 100);
    expect(result.direction).toBe('up');
    expect(result.percentage).toBe(10);
  });

  it('returns down when current is more than 5% below prev', () => {
    const result = calcTrend(90, 100);
    expect(result.direction).toBe('down');
    expect(result.percentage).toBe(10);
  });

  it('returns stable when change is within ±5%', () => {
    expect(calcTrend(104, 100).direction).toBe('stable');
    expect(calcTrend(97, 100).direction).toBe('stable');
    expect(calcTrend(100, 100).direction).toBe('stable');
  });

  it('returns stable with 0% when prev is 0 (avoids division by zero)', () => {
    const result = calcTrend(100, 0);
    expect(result.direction).toBe('stable');
    expect(result.percentage).toBe(0);
  });

  it('down direction percentage is always positive', () => {
    const result = calcTrend(50, 100);
    expect(result.percentage).toBe(50);
    expect(result.percentage).toBeGreaterThan(0);
  });
});

// ── buildCategoryBreakdown ────────────────────────────────────────────────────

describe('buildCategoryBreakdown', () => {
  const current = [
    { category: 'alimentacao', total: 200, percentage: 67, count: 4 },
    { category: 'transporte', total: 100, percentage: 33, count: 2 },
  ];

  const prev = [
    { category: 'alimentacao', total: 150, percentage: 60, count: 3 },
    { category: 'transporte', total: 120, percentage: 40, count: 2 },
  ];

  it('attaches trend when hasPrevData is true', () => {
    const result = buildCategoryBreakdown(current, prev, true);
    expect(result[0].trend).not.toBeNull();
    expect(result[0].trend?.direction).toBe('up'); // 200 vs 150 = +33%
  });

  it('sets trend to null when hasPrevData is false', () => {
    const result = buildCategoryBreakdown(current, prev, false);
    result.forEach((item) => expect(item.trend).toBeNull());
  });

  it('uses stable trend for category not present in prev period', () => {
    const newCat = [
      ...current,
      { category: 'lazer', total: 50, percentage: 17, count: 1 },
    ];
    const result = buildCategoryBreakdown(newCat, prev, true);
    const lazer = result.find((r) => r.category === 'lazer');
    expect(lazer?.trend?.direction).toBe('stable'); // prev = 0, treated as stable
  });

  it('preserves all CategoryData fields', () => {
    const result = buildCategoryBreakdown(current, prev, true);
    expect(result[0]).toMatchObject({
      category: 'alimentacao',
      total: 200,
      percentage: 67,
      count: 4,
    });
  });

  it('returns empty array for empty current data', () => {
    expect(buildCategoryBreakdown([], prev, true)).toEqual([]);
  });
});
