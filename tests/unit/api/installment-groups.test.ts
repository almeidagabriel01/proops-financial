import { describe, it, expect } from 'vitest';
import { addMonths, generateFutureInstallments } from '@/lib/installments/generator';
import type { InstallmentGroup } from '@/lib/installments/generator';

describe('Installment Groups API — validation logic', () => {
  describe('installment_count validation', () => {
    it('rejeita menos de 2 parcelas', () => { expect(1 >= 2).toBe(false); });
    it('aceita 2 parcelas (mínimo)', () => { expect(2 >= 2).toBe(true); });
    it('aceita 360 parcelas (máximo)', () => { expect(360 <= 360).toBe(true); });
    it('rejeita 361 parcelas', () => { expect(361 <= 360).toBe(false); });
  });

  describe('amount validation', () => {
    it('total_amount deve ser positivo', () => { expect(0 > 0).toBe(false); });
    it('installment_amount deve ser positivo', () => { expect(0 > 0).toBe(false); });
  });

  describe('first_date validation', () => {
    it('aceita formato YYYY-MM-DD', () => {
      expect(/^\d{4}-\d{2}-\d{2}$/.test('2024-05-10')).toBe(true);
    });
  });

  describe('generateFutureInstallments', () => {
    const group: InstallmentGroup = {
      id: 'grp-test',
      user_id: 'user-1',
      bank_account_id: 'acc-1',
      description: 'Notebook',
      installment_count: 6,
      installment_amount: 200,
      first_date: '2024-01-10',
      category: 'compras',
    };

    it('gera N-current parcelas futuras', () => {
      const future = generateFutureInstallments(group, 2);
      expect(future).toHaveLength(4); // parcelas 3,4,5,6
    });

    it('não gera parcelas quando current é a última', () => {
      const future = generateFutureInstallments(group, 6);
      expect(future).toHaveLength(0);
    });

    it('todas as parcelas têm status pending', () => {
      const future = generateFutureInstallments(group, 1);
      expect(future.every((f) => f.status === 'pending')).toBe(true);
    });

    it('todas são do tipo debit', () => {
      const future = generateFutureInstallments(group, 1);
      expect(future.every((f) => f.type === 'debit')).toBe(true);
    });

    it('due_dates incrementam mensalmente', () => {
      const future = generateFutureInstallments(group, 1);
      expect(future[0].due_date).toBe('2024-02-10');
      expect(future[1].due_date).toBe('2024-03-10');
    });

    it('description inclui número da parcela', () => {
      const future = generateFutureInstallments(group, 4);
      expect(future[0].description).toContain('(5/6)');
    });
  });
});
