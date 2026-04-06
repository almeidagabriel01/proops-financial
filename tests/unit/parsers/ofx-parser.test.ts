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

  it('handles duplicate FITIDs within the same file by appending suffix', () => {
    const content = `
<OFX>
<BANKMSGSRSV1>
<STMTTRNRS>
<STMTRS>
<BANKTRANLIST>
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20240115
<TRNAMT>-0.62
<FITID>69b3331b-3c74-4413-b3c0-45bbdeccacc7
<NAME>IOF de rotativo
</STMTTRN>
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20240115
<TRNAMT>-15.74
<FITID>69b3331b-3c74-4413-b3c0-45bbdeccacc7
<NAME>Juros de rotativo
</STMTTRN>
</BANKTRANLIST>
</STMTRS>
</STMTTRNRS>
</BANKMSGSRSV1>
</OFX>`;
    const transactions = parseOFX(content);
    expect(transactions).toHaveLength(2);
    expect(transactions[0].external_id).toBe('69b3331b-3c74-4413-b3c0-45bbdeccacc7');
    expect(transactions[1].external_id).toBe('69b3331b-3c74-4413-b3c0-45bbdeccacc7_2');
    expect(transactions[0].description).toBe('IOF de rotativo');
    expect(transactions[1].description).toBe('Juros de rotativo');
    const ids = transactions.map((t) => t.external_id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('handles triple FITID collision appending _2 and _3', () => {
    const content = `
<OFX>
<BANKMSGSRSV1>
<STMTTRNRS>
<STMTRS>
<BANKTRANLIST>
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20240115
<TRNAMT>-1.00
<FITID>DUPID
<NAME>Tx 1
</STMTTRN>
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20240115
<TRNAMT>-2.00
<FITID>DUPID
<NAME>Tx 2
</STMTTRN>
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20240115
<TRNAMT>-3.00
<FITID>DUPID
<NAME>Tx 3
</STMTTRN>
</BANKTRANLIST>
</STMTRS>
</STMTTRNRS>
</BANKMSGSRSV1>
</OFX>`;
    const transactions = parseOFX(content);
    expect(transactions).toHaveLength(3);
    expect(transactions[0].external_id).toBe('DUPID');
    expect(transactions[1].external_id).toBe('DUPID_2');
    expect(transactions[2].external_id).toBe('DUPID_3');
  });
});
