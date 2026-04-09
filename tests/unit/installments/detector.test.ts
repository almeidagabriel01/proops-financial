import { describe, it, expect } from 'vitest';
import { detectInstallments, extractInstallmentInfo } from '@/lib/installments/detector';
import type { ParsedTransaction } from '@/lib/parsers/types';

const makeDebit = (description: string): ParsedTransaction => ({
  external_id: `test_${description}`,
  date: '2024-01-15',
  description,
  amount: -100,
  type: 'debit',
});

describe('extractInstallmentInfo', () => {
  it('detecta padrão X/Y', () => {
    const result = extractInstallmentInfo('COMPRA LOJA XPTO 3/10');
    expect(result).not.toBeNull();
    expect(result!.currentNumber).toBe(3);
    expect(result!.totalCount).toBe(10);
    expect(result!.baseDescription).toBe('COMPRA LOJA XPTO');
  });

  it('detecta padrão com zeros 03/10', () => {
    const result = extractInstallmentInfo('MAGAZINE 03/12');
    expect(result!.currentNumber).toBe(3);
    expect(result!.totalCount).toBe(12);
  });

  it('detecta padrão PARCELA X DE Y', () => {
    const result = extractInstallmentInfo('LOJA ABC PARCELA 2 DE 6');
    expect(result!.currentNumber).toBe(2);
    expect(result!.totalCount).toBe(6);
  });

  it('detecta padrão PARC X DE Y', () => {
    const result = extractInstallmentInfo('COMPRA PARC 1 DE 3');
    expect(result!.currentNumber).toBe(1);
    expect(result!.totalCount).toBe(3);
  });

  it('retorna null para transação sem parcela', () => {
    expect(extractInstallmentInfo('SUPERMERCADO EXTRA')).toBeNull();
    expect(extractInstallmentInfo('PIX FULANO')).toBeNull();
  });

  it('retorna null para totais absurdos', () => {
    // 3/10 é detectado, mas 400 parcelas seria filtrado pelo detectInstallments
    expect(extractInstallmentInfo('COMPRA 1/1')).toBeNull(); // total < 2 é filtrado depois
  });
});

describe('detectInstallments', () => {
  it('detecta parcela em array de transações', () => {
    const txs: ParsedTransaction[] = [
      makeDebit('SUPERMERCADO'),
      makeDebit('COMPRA LOJA 3/10'),
      makeDebit('PIX AMIGO'),
    ];
    const result = detectInstallments(txs);
    expect(result).toHaveLength(1);
    expect(result[0].transactionIndex).toBe(1);
    expect(result[0].currentNumber).toBe(3);
    expect(result[0].totalCount).toBe(10);
  });

  it('ignora créditos (parcelas são sempre débito)', () => {
    const txs: ParsedTransaction[] = [
      { external_id: 'c1', date: '2024-01-01', description: 'CREDITO 1/3', amount: 100, type: 'credit' },
    ];
    expect(detectInstallments(txs)).toHaveLength(0);
  });

  it('ignora quando currentNumber > totalCount', () => {
    const txs = [makeDebit('COMPRA 11/10')];
    expect(detectInstallments(txs)).toHaveLength(0);
  });

  it('detecta múltiplas parcelas', () => {
    const txs: ParsedTransaction[] = [
      makeDebit('LOJA A 1/6'),
      makeDebit('LOJA B 2/12'),
      makeDebit('SUPERMERCADO'),
    ];
    const result = detectInstallments(txs);
    expect(result).toHaveLength(2);
  });

  it('retorna array vazio sem parcelas', () => {
    const txs = [makeDebit('PIX'), makeDebit('SUPERMERCADO'), makeDebit('COMBUSTIVEL')];
    expect(detectInstallments(txs)).toHaveLength(0);
  });
});
