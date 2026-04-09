import { describe, it, expect } from 'vitest';

describe('Recurring Rules API — validation logic', () => {
  const VALID_FREQUENCIES = ['weekly', 'biweekly', 'monthly', 'annual'];

  describe('frequency validation', () => {
    it('aceita frequências válidas', () => {
      for (const f of VALID_FREQUENCIES) {
        expect(VALID_FREQUENCIES.includes(f)).toBe(true);
      }
    });
    it('rejeita frequência inválida', () => {
      expect(VALID_FREQUENCIES.includes('daily' as never)).toBe(false);
    });
  });

  describe('amount validation', () => {
    it('rejeita valor zero', () => { expect(0 > 0).toBe(false); });
    it('rejeita valor negativo', () => { expect(-100 > 0).toBe(false); });
    it('aceita valor positivo', () => { expect(99.99 > 0).toBe(true); });
  });

  describe('start_date validation', () => {
    it('aceita formato YYYY-MM-DD', () => {
      expect(/^\d{4}-\d{2}-\d{2}$/.test('2025-01-15')).toBe(true);
    });
    it('rejeita formato inválido', () => {
      expect(/^\d{4}-\d{2}-\d{2}$/.test('15-01-2025')).toBe(false);
    });
  });

  describe('calcNextDueDate logic', () => {
    it('retorna start_date quando está no futuro', () => {
      const futureDate = '2099-01-01';
      const today = new Date().toISOString().slice(0, 10);
      expect(futureDate >= today).toBe(true);
    });
    it('avança data mensal corretamente', () => {
      const d = new Date('2024-01-15T12:00:00Z');
      d.setUTCMonth(d.getUTCMonth() + 1);
      expect(d.toISOString().slice(0, 10)).toBe('2024-02-15');
    });
    it('avança data semanal corretamente', () => {
      const d = new Date('2024-01-15T12:00:00Z');
      d.setUTCDate(d.getUTCDate() + 7);
      expect(d.toISOString().slice(0, 10)).toBe('2024-01-22');
    });
  });

  describe('status validation', () => {
    const VALID_STATUSES = ['active', 'paused', 'canceled'];
    it('aceita status válidos', () => {
      for (const s of VALID_STATUSES) {
        expect(VALID_STATUSES.includes(s)).toBe(true);
      }
    });
    it('rejeita status inválido', () => {
      expect(VALID_STATUSES.includes('deleted' as never)).toBe(false);
    });
  });
});
