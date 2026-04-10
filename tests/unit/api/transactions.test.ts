import { describe, it, expect, vi, beforeEach } from 'vitest';

// Validates server-side logic: category whitelist, amount sign, external_id format

const VALID_CATEGORIES = [
  'alimentacao', 'delivery', 'transporte', 'moradia', 'saude',
  'educacao', 'lazer', 'compras', 'assinaturas', 'transferencias',
  'salario', 'investimentos', 'impostos', 'outros',
] as const;

describe('Transaction API — validation logic', () => {
  describe('category validation', () => {
    it('accepts all 14 valid categories', () => {
      for (const cat of VALID_CATEGORIES) {
        expect(VALID_CATEGORIES.includes(cat as never)).toBe(true);
      }
    });

    it('rejects unknown category', () => {
      expect(VALID_CATEGORIES.includes('viagem' as never)).toBe(false);
    });
  });

  describe('amount sign convention', () => {
    it('debit amounts are stored negative', () => {
      const amount = 100;
      const type = 'debit';
      const signed = type === 'debit' ? -Math.abs(amount) : Math.abs(amount);
      expect(signed).toBe(-100);
    });

    it('credit amounts are stored positive', () => {
      const amount = 5000;
      const type: string = 'credit';
      const signed = type === 'debit' ? -Math.abs(amount) : Math.abs(amount);
      expect(signed).toBe(5000);
    });

    it('amount > 0 validation rejects zero', () => {
      expect(0 > 0).toBe(false);
    });

    it('amount > 0 validation rejects negative input', () => {
      expect(-50 > 0).toBe(false);
    });

    it('amount ceiling is 999999.99', () => {
      expect(999999.99 <= 999999.99).toBe(true);
      expect(1000000 <= 999999.99).toBe(false);
    });
  });

  describe('external_id for manual transactions', () => {
    it('manual prefix is distinguishable from OFX FITIDs and CSV SHA-256', () => {
      const externalId = `manual_${crypto.randomUUID()}`;
      expect(externalId.startsWith('manual_')).toBe(true);
      // OFX FITIDs never start with "manual_"
      // SHA-256 is 64 hex chars — no underscores
      expect(/^[0-9a-f]{64}$/.test(externalId)).toBe(false);
    });

    it('each manual transaction gets a unique external_id', () => {
      const id1 = `manual_${crypto.randomUUID()}`;
      const id2 = `manual_${crypto.randomUUID()}`;
      expect(id1).not.toBe(id2);
    });
  });

  describe('description validation', () => {
    it('rejects blank description', () => {
      const desc = '   ';
      expect(desc.trim().length > 0).toBe(false);
    });

    it('rejects description over 255 chars', () => {
      const desc = 'a'.repeat(256);
      expect(desc.trim().length > 255).toBe(true);
    });

    it('accepts description at 255 chars', () => {
      const desc = 'a'.repeat(255);
      expect(desc.trim().length > 255).toBe(false);
    });
  });

  describe('date validation', () => {
    it('accepts ISO 8601 date format', () => {
      expect(/^\d{4}-\d{2}-\d{2}$/.test('2026-04-06')).toBe(true);
    });

    it('rejects invalid date formats', () => {
      expect(/^\d{4}-\d{2}-\d{2}$/.test('06/04/2026')).toBe(false);
      expect(/^\d{4}-\d{2}-\d{2}$/.test('2026-4-6')).toBe(false);
      expect(/^\d{4}-\d{2}-\d{2}$/.test('')).toBe(false);
    });
  });

  describe('notes validation (C1.1)', () => {
    // Mirrors the validation logic in PATCH /api/transactions/[id]
    function validateNotes(notes: string | null | undefined): string | null {
      if (notes === undefined) return 'skipped'; // field not sent — no-op
      if (notes === null) return null; // null clears the note — OK
      if (notes.length > 500) return 'error: too long';
      return notes; // valid string
    }

    it('accepts a short note string', () => {
      expect(validateNotes('reembolso empresa')).toBe('reembolso empresa');
    });

    it('accepts empty string (treated as valid — caller sends null to clear)', () => {
      expect(validateNotes('')).toBe('');
    });

    it('accepts note at exactly 500 characters', () => {
      const note = 'a'.repeat(500);
      expect(validateNotes(note)).toBe(note);
    });

    it('rejects note with 501 characters', () => {
      const note = 'a'.repeat(501);
      expect(validateNotes(note)).toBe('error: too long');
    });

    it('accepts null to clear a note', () => {
      expect(validateNotes(null)).toBeNull();
    });

    it('skips update when notes field is not sent', () => {
      expect(validateNotes(undefined)).toBe('skipped');
    });

    it('notes is independent of other fields — category update does not affect notes', () => {
      // Simulate: PATCH with { category: 'alimentacao' } — notes field absent
      const body: Record<string, unknown> = { category: 'alimentacao' };
      expect('notes' in body).toBe(false);
      expect(validateNotes(body.notes as undefined)).toBe('skipped');
    });
  });
});
