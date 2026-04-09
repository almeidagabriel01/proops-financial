import { describe, it, expect } from 'vitest';
import { addMonths, generateFutureInstallments } from '@/lib/installments/generator';
import type { InstallmentGroup } from '@/lib/installments/generator';

const baseGroup: InstallmentGroup = {
  id: 'grp-1',
  user_id: 'user-1',
  bank_account_id: 'acc-1',
  description: 'TV Samsung',
  installment_count: 6,
  installment_amount: 100,
  first_date: '2024-01-15',
  category: 'compras',
};

describe('addMonths', () => {
  it('adiciona meses corretamente', () => {
    expect(addMonths('2024-01-15', 1)).toBe('2024-02-15');
    expect(addMonths('2024-01-15', 6)).toBe('2024-07-15');
    expect(addMonths('2024-12-15', 1)).toBe('2025-01-15');
  });

  it('ajusta para último dia do mês quando necessário', () => {
    // 31 jan + 1 mês = 29 fev (2024 é bissexto)
    expect(addMonths('2024-01-31', 1)).toBe('2024-02-29');
    // 31 jan + 2 meses = 31 mar
    expect(addMonths('2024-01-31', 2)).toBe('2024-03-31');
  });
});

describe('generateFutureInstallments', () => {
  it('gera parcelas futuras a partir da atual', () => {
    const result = generateFutureInstallments(baseGroup, 2);
    // Parcelas 3, 4, 5, 6
    expect(result).toHaveLength(4);
    expect(result[0].installment_number).toBe(3);
    expect(result[3].installment_number).toBe(6);
  });

  it('calcula datas corretamente (1 mês de diferença)', () => {
    const result = generateFutureInstallments(baseGroup, 1);
    // Parcela 2 = first_date + 1 mês
    expect(result[0].due_date).toBe('2024-02-15');
    // Parcela 3 = first_date + 2 meses
    expect(result[1].due_date).toBe('2024-03-15');
  });

  it('retorna array vazio se já é a última parcela', () => {
    const result = generateFutureInstallments(baseGroup, 6);
    expect(result).toHaveLength(0);
  });

  it('define campos corretos em cada parcela', () => {
    const result = generateFutureInstallments(baseGroup, 5);
    expect(result).toHaveLength(1);
    const parcela = result[0];
    expect(parcela.user_id).toBe('user-1');
    expect(parcela.bank_account_id).toBe('acc-1');
    expect(parcela.amount).toBe(100);
    expect(parcela.type).toBe('debit');
    expect(parcela.status).toBe('pending');
    expect(parcela.installment_group_id).toBe('grp-1');
    expect(parcela.installment_number).toBe(6);
  });

  it('inclui número da parcela na descrição', () => {
    const result = generateFutureInstallments(baseGroup, 1);
    expect(result[0].description).toContain('2/6');
  });
});
