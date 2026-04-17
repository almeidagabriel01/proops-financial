export const IRPF_CATEGORIES = ['saude', 'educacao'] as const;
export type IrpfCategory = (typeof IRPF_CATEGORIES)[number];

export const IRPF_FICHA: Record<IrpfCategory, string> = {
  saude: 'Despesas Médicas e de Saúde',
  educacao: 'Instrução',
};

// Limite anual por dependente em R$ — atualizar anualmente após publicação da Receita Federal
export const EDUCATION_LIMITS: Record<number, number> = {
  2023: 3561.50,
  2024: 3561.50,
  2025: 3561.50,
  // 2026: a publicar
};

export function getEducationLimit(year: number): number | null {
  return EDUCATION_LIMITS[year] ?? null;
}
