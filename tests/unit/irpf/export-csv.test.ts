import { describe, it, expect } from 'vitest';
import { generateIrpfCsv, type IrpfTransaction } from '@/lib/irpf/export-csv';

function makeTransaction(overrides: Partial<IrpfTransaction> = {}): IrpfTransaction {
  return {
    date: '2024-03-15',
    description: 'Consulta médica',
    category: 'saude',
    amount: -250.00,
    ...overrides,
  };
}

describe('generateIrpfCsv', () => {
  it('returns a Buffer', () => {
    const buf = generateIrpfCsv([makeTransaction()], 2024);
    expect(Buffer.isBuffer(buf)).toBe(true);
  });

  it('starts with UTF-8 BOM for Excel compatibility', () => {
    const buf = generateIrpfCsv([makeTransaction()], 2024);
    expect(buf[0]).toBe(0xef);
    expect(buf[1]).toBe(0xbb);
    expect(buf[2]).toBe(0xbf);
  });

  it('contains year in the header title', () => {
    const buf = generateIrpfCsv([makeTransaction()], 2024);
    const text = buf.toString('utf8');
    expect(text).toContain('2024');
  });

  it('includes CSV column headers', () => {
    const buf = generateIrpfCsv([makeTransaction()], 2024);
    const text = buf.toString('utf8');
    expect(text).toContain('Data');
    expect(text).toContain('Descrição');
    expect(text).toContain('Valor (R$)');
  });

  it('uses semicolons as delimiters', () => {
    const buf = generateIrpfCsv([makeTransaction()], 2024);
    const text = buf.toString('utf8');
    expect(text).toContain(';');
  });

  it('includes transaction description', () => {
    const tx = makeTransaction({ description: 'Dentista Dr. Silva' });
    const buf = generateIrpfCsv([tx], 2024);
    const text = buf.toString('utf8');
    expect(text).toContain('Dentista Dr. Silva');
  });

  it('formats amount using comma as decimal separator', () => {
    const tx = makeTransaction({ amount: -250.50, category: 'saude' });
    const buf = generateIrpfCsv([tx], 2024);
    const text = buf.toString('utf8');
    expect(text).toContain('250,50');
  });

  it('uses absolute value for amounts (negative inputs)', () => {
    const tx = makeTransaction({ amount: -500.00 });
    const buf = generateIrpfCsv([tx], 2024);
    const text = buf.toString('utf8');
    expect(text).toContain('500,00');
    expect(text).not.toContain('-500');
  });

  it('includes the correct IRPF ficha for saude', () => {
    const tx = makeTransaction({ category: 'saude' });
    const buf = generateIrpfCsv([tx], 2024);
    const text = buf.toString('utf8');
    expect(text).toContain('Despesas Médicas e de Saúde');
  });

  it('includes the correct IRPF ficha for educacao', () => {
    const tx = makeTransaction({ category: 'educacao', description: 'Curso online' });
    const buf = generateIrpfCsv([tx], 2024);
    const text = buf.toString('utf8');
    expect(text).toContain('Instrução');
  });

  it('includes totals section at the end', () => {
    const buf = generateIrpfCsv([makeTransaction()], 2024);
    const text = buf.toString('utf8');
    expect(text).toContain('TOTAIS');
  });

  it('calculates saude total correctly', () => {
    const txs = [
      makeTransaction({ amount: -100.00, category: 'saude' }),
      makeTransaction({ amount: -200.00, category: 'saude' }),
    ];
    const buf = generateIrpfCsv(txs, 2024);
    const text = buf.toString('utf8');
    expect(text).toContain('300,00');
  });

  it('calculates educacao total separately', () => {
    const txs = [
      makeTransaction({ amount: -100.00, category: 'saude' }),
      makeTransaction({ amount: -150.00, category: 'educacao', description: 'Livro' }),
    ];
    const buf = generateIrpfCsv(txs, 2024);
    const text = buf.toString('utf8');
    expect(text).toContain('150,00');
  });

  it('handles empty transaction list', () => {
    const buf = generateIrpfCsv([], 2024);
    const text = buf.toString('utf8');
    expect(text).toContain('TOTAIS');
    expect(text).toContain('0,00');
  });

  it('escapes double quotes in description', () => {
    const tx = makeTransaction({ description: 'Consulta "Especial"' });
    const buf = generateIrpfCsv([tx], 2024);
    const text = buf.toString('utf8');
    expect(text).toContain('""Especial""');
  });

  it('formats date as DD/MM/YYYY locale pattern', () => {
    const tx = makeTransaction({ date: '2024-03-15' });
    const buf = generateIrpfCsv([tx], 2024);
    const text = buf.toString('utf8');
    // toLocaleDateString('pt-BR') produces DD/MM/YYYY; exact day may vary by
    // timezone, so verify the format pattern and the year
    expect(text).toMatch(/\d{2}\/03\/2024/);
  });
});
