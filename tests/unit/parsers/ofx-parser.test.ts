import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { parseOFX } from '@/lib/parsers/ofx-parser';

const fixture = (name: string) =>
  readFileSync(join(process.cwd(), 'tests/fixtures', name), 'utf-8');

describe('parseOFX', () => {
  it('parses itau-sample.ofx and returns 5 transactions', () => {
    const content = fixture('itau-sample.ofx');
    const transactions = parseOFX(content);
    expect(transactions).toHaveLength(5);
  });

  it('extracts correct date in ISO format', () => {
    const content = fixture('itau-sample.ofx');
    const transactions = parseOFX(content);
    expect(transactions[0].date).toBe('2024-01-01');
    expect(transactions[1].date).toBe('2024-01-05');
  });

  it('sets correct amount (positive for credit, negative for debit)', () => {
    const content = fixture('itau-sample.ofx');
    const transactions = parseOFX(content);
    const credit = transactions.find((t) => t.external_id === '202401010001');
    const debit = transactions.find((t) => t.external_id === '202401050001');
    expect(credit?.amount).toBe(3000);
    expect(debit?.amount).toBe(-49.9);
  });

  it('uses FITID as external_id', () => {
    const content = fixture('itau-sample.ofx');
    const transactions = parseOFX(content);
    const ids = transactions.map((t) => t.external_id);
    expect(ids).toContain('202401010001');
    expect(ids).toContain('202401050001');
    expect(ids).toContain('202401100001');
  });

  it('sets correct type (credit/debit)', () => {
    const content = fixture('itau-sample.ofx');
    const transactions = parseOFX(content);
    expect(transactions[0].type).toBe('credit');
    expect(transactions[1].type).toBe('debit');
    expect(transactions[2].type).toBe('debit');
  });

  it('extracts description from NAME field', () => {
    const content = fixture('itau-sample.ofx');
    const transactions = parseOFX(content);
    expect(transactions[0].description).toBe('SALARIO EMPRESA XYZ');
    expect(transactions[1].description).toBe('COMPRA IFOOD');
  });

  it('throws on empty/invalid OFX content', () => {
    expect(() => parseOFX('')).toThrow();
    expect(() => parseOFX('<OFX><BANKMSGSRSV1></BANKMSGSRSV1></OFX>')).toThrow();
  });

  it('all external_ids are unique', () => {
    const content = fixture('itau-sample.ofx');
    const transactions = parseOFX(content);
    const ids = transactions.map((t) => t.external_id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
