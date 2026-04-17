import { describe, it, expect } from 'vitest';
import {
  IRPF_CATEGORIES,
  IRPF_FICHA,
  EDUCATION_LIMITS,
  getEducationLimit,
} from '@/lib/irpf/category-mapping';

describe('IRPF_CATEGORIES', () => {
  it('contains saude and educacao', () => {
    expect(IRPF_CATEGORIES).toContain('saude');
    expect(IRPF_CATEGORIES).toContain('educacao');
  });

  it('has exactly 2 categories', () => {
    expect(IRPF_CATEGORIES).toHaveLength(2);
  });
});

describe('IRPF_FICHA', () => {
  it('maps saude to correct ficha label', () => {
    expect(IRPF_FICHA.saude).toBe('Despesas Médicas e de Saúde');
  });

  it('maps educacao to correct ficha label', () => {
    expect(IRPF_FICHA.educacao).toBe('Instrução');
  });
});

describe('EDUCATION_LIMITS', () => {
  it('has limit for 2023', () => {
    expect(EDUCATION_LIMITS[2023]).toBe(3561.50);
  });

  it('has same limit for 2024 and 2025', () => {
    expect(EDUCATION_LIMITS[2024]).toBe(EDUCATION_LIMITS[2025]);
  });
});

describe('getEducationLimit', () => {
  it('returns limit for known year', () => {
    expect(getEducationLimit(2024)).toBe(3561.50);
  });

  it('returns null for unknown year', () => {
    expect(getEducationLimit(2026)).toBeNull();
  });

  it('returns null for year 0', () => {
    expect(getEducationLimit(0)).toBeNull();
  });

  it('returns null for past years not in table', () => {
    expect(getEducationLimit(2020)).toBeNull();
  });
});
