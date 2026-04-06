import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { parseCSV } from '@/lib/parsers/csv-parser';
import { normalizeDescription, generateExternalId } from '@/lib/parsers/utils';

const fixture = (name: string) =>
  readFileSync(join(process.cwd(), 'tests/fixtures', name), 'utf-8');

describe('parseCSV — Nubank', () => {
  it('parses nubank-sample.csv and returns 5 transactions', () => {
    const content = fixture('nubank-sample.csv');
    const transactions = parseCSV(content, 'Nubank');
    expect(transactions).toHaveLength(5);
  });

  it('detects correct type (credit/debit)', () => {
    const content = fixture('nubank-sample.csv');
    const transactions = parseCSV(content, 'Nubank');
    expect(transactions[0].type).toBe('credit');  // 1500.00
    expect(transactions[1].type).toBe('debit');   // -49.90
  });

  it('parses date in ISO format YYYY-MM-DD', () => {
    const content = fixture('nubank-sample.csv');
    const transactions = parseCSV(content, 'Nubank');
    expect(transactions[0].date).toBe('2024-01-01');
    expect(transactions[1].date).toBe('2024-01-05');
  });

  it('generates SHA-256 external_id for each row', () => {
    const content = fixture('nubank-sample.csv');
    const transactions = parseCSV(content, 'Nubank');
    expect(transactions[0].external_id).toHaveLength(64); // SHA-256 hex = 64 chars
  });

  it('all external_ids are unique', () => {
    const content = fixture('nubank-sample.csv');
    const transactions = parseCSV(content, 'Nubank');
    const ids = transactions.map((t) => t.external_id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('external_id is deterministic (same input = same hash)', () => {
    const content = fixture('nubank-sample.csv');
    const t1 = parseCSV(content, 'Nubank');
    const t2 = parseCSV(content, 'Nubank');
    expect(t1[0].external_id).toBe(t2[0].external_id);
  });
});

describe('parseCSV — Bradesco', () => {
  it('parses bradesco-sample.csv and returns 5 transactions', () => {
    const content = fixture('bradesco-sample.csv');
    const transactions = parseCSV(content, 'Bradesco');
    expect(transactions).toHaveLength(5);
  });

  it('detects correct type (credit/debit)', () => {
    const content = fixture('bradesco-sample.csv');
    const transactions = parseCSV(content, 'Bradesco');
    expect(transactions[0].type).toBe('credit');  // TED CRÉDITO
    expect(transactions[1].type).toBe('debit');   // DEB. AUTOMÁTICO
  });

  it('parses BR date DD/MM/YYYY to YYYY-MM-DD', () => {
    const content = fixture('bradesco-sample.csv');
    const transactions = parseCSV(content, 'Bradesco');
    expect(transactions[0].date).toBe('2024-01-01');
    expect(transactions[1].date).toBe('2024-01-05');
  });

  it('positive amount for credit, negative for debit', () => {
    const content = fixture('bradesco-sample.csv');
    const transactions = parseCSV(content, 'Bradesco');
    expect(transactions[0].amount).toBe(3000);
    expect(transactions[1].amount).toBe(-49.9);
  });
});

describe('parseCSV — Itaú', () => {
  it('parses itau-sample.csv and returns 5 transactions', () => {
    const content = fixture('itau-sample.csv');
    const transactions = parseCSV(content, 'Itau');
    expect(transactions).toHaveLength(5);
  });

  it('detects correct type (credit/debit)', () => {
    const content = fixture('itau-sample.csv');
    const transactions = parseCSV(content, 'Itau');
    expect(transactions[0].type).toBe('credit');  // SALARIO 3000,00
    expect(transactions[1].type).toBe('debit');   // IFOOD -49,90
  });

  it('parses BR date DD/MM/YYYY to YYYY-MM-DD', () => {
    const content = fixture('itau-sample.csv');
    const transactions = parseCSV(content, 'Itau');
    expect(transactions[0].date).toBe('2024-01-01');
    expect(transactions[1].date).toBe('2024-01-05');
  });

  it('parses amount correctly (BRL format with comma decimal)', () => {
    const content = fixture('itau-sample.csv');
    const transactions = parseCSV(content, 'Itau');
    expect(transactions[0].amount).toBe(3000);
    expect(transactions[1].amount).toBe(-49.9);
    expect(transactions[2].amount).toBe(-150);
  });

  it('generates SHA-256 external_id (64-char hex)', () => {
    const content = fixture('itau-sample.csv');
    const transactions = parseCSV(content, 'Itau');
    expect(transactions[0].external_id).toHaveLength(64);
    expect(transactions[0].external_id).toMatch(/^[a-f0-9]+$/);
  });

  it('all external_ids are unique', () => {
    const content = fixture('itau-sample.csv');
    const transactions = parseCSV(content, 'Itau');
    const ids = transactions.map((t) => t.external_id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('external_id is deterministic', () => {
    const content = fixture('itau-sample.csv');
    const t1 = parseCSV(content, 'Itau');
    const t2 = parseCSV(content, 'Itau');
    expect(t1[0].external_id).toBe(t2[0].external_id);
  });
});

describe('parseCSV — auto-format detection (no bank hint)', () => {
  it('detects Nubank format from headers', () => {
    const content = fixture('nubank-sample.csv');
    const transactions = parseCSV(content); // no bankName
    expect(transactions).toHaveLength(5);
  });

  it('detects Bradesco format from headers', () => {
    const content = fixture('bradesco-sample.csv');
    const transactions = parseCSV(content);
    expect(transactions).toHaveLength(5);
  });

  it('detects Itaú format from headers', () => {
    const content = fixture('itau-sample.csv');
    const transactions = parseCSV(content);
    expect(transactions).toHaveLength(5);
  });
});

describe('parseCSV — error cases', () => {
  it('throws on empty CSV', () => {
    expect(() => parseCSV('')).toThrow();
  });

  it('throws on header-only CSV', () => {
    expect(() => parseCSV('Data,Valor,Descrição\n')).toThrow();
  });
});

describe('normalizeDescription', () => {
  it('lowercases and trims', () => {
    expect(normalizeDescription('  IFOOD  ')).toBe('ifood');
  });

  it('removes accents', () => {
    expect(normalizeDescription('Pão de Açúcar')).toBe('pao de acucar');
  });

  it('removes special characters', () => {
    expect(normalizeDescription('COMPRA*IFOOD#123')).toBe('compraifo od123'.replace(' ', ''));
    // more predictable test:
    expect(normalizeDescription('abc!@#123')).toBe('abc123');
  });

  it('collapses multiple spaces', () => {
    expect(normalizeDescription('uber   trip   sp')).toBe('uber trip sp');
  });
});

describe('generateExternalId', () => {
  it('returns 64-char hex string', () => {
    const id = generateExternalId('2024-01-01', -49.9, 'iFood');
    expect(id).toHaveLength(64);
    expect(id).toMatch(/^[a-f0-9]+$/);
  });

  it('is deterministic', () => {
    const id1 = generateExternalId('2024-01-01', -49.9, 'iFood');
    const id2 = generateExternalId('2024-01-01', -49.9, 'iFood');
    expect(id1).toBe(id2);
  });

  it('differs for different inputs', () => {
    const id1 = generateExternalId('2024-01-01', -49.9, 'iFood');
    const id2 = generateExternalId('2024-01-02', -49.9, 'iFood');
    expect(id1).not.toBe(id2);
  });
});
