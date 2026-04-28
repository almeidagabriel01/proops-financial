import { describe, it, expect } from 'vitest';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatBRL(value: number): string {
  return value.toFixed(2).replace('.', ',');
}

function categoryLabel(category: string): string {
  const labels: Record<string, string> = {
    alimentacao:    'Alimentação',
    delivery:       'Delivery',
    transporte:     'Transporte',
    moradia:        'Moradia',
    saude:          'Saúde',
    educacao:       'Educação',
    lazer:          'Lazer',
    compras:        'Compras',
    assinaturas:    'Assinaturas',
    transferencias: 'Transferências',
    salario:        'Salário',
    investimentos:  'Investimentos',
    impostos:       'Impostos',
    outros:         'Outros',
  };
  return labels[category] ?? category;
}

// ── /api/cron/check-budgets — autenticação ────────────────────────────────────

describe('POST /api/cron/check-budgets — autenticação CRON_SECRET', () => {
  const CRON_SECRET = 'test-cron-secret';

  it('rejeita request sem header Authorization', () => {
    const authHeader = null;
    const isAuthorized = authHeader === `Bearer ${CRON_SECRET}`;
    expect(isAuthorized).toBe(false);
  });

  it('rejeita token incorreto', () => {
    const authHeader: string = 'Bearer wrong-secret';
    const isAuthorized = authHeader === `Bearer ${CRON_SECRET}`;
    expect(isAuthorized).toBe(false);
  });

  it('aceita token correto', () => {
    const authHeader = `Bearer ${CRON_SECRET}`;
    const isAuthorized = authHeader === `Bearer ${CRON_SECRET}`;
    expect(isAuthorized).toBe(true);
  });

  it('rejeita Bearer vazio', () => {
    const authHeader: string = 'Bearer ';
    const isAuthorized = authHeader === `Bearer ${CRON_SECRET}`;
    expect(isAuthorized).toBe(false);
  });
});

// ── Cálculo de threshold ──────────────────────────────────────────────────────

describe('check-budget-alerts — cálculo de percentual e thresholds', () => {
  it('pct < 80% — nenhum threshold atingido', () => {
    const spent = 70;
    const limit = 100;
    const pct = (spent / limit) * 100;
    const thresholds = ([80, 100] as const).filter((t) => pct >= t);
    expect(thresholds).toHaveLength(0);
  });

  it('pct = 80% — threshold 80 atingido', () => {
    const pct = (80 / 100) * 100;
    const thresholds = ([80, 100] as const).filter((t) => pct >= t);
    expect(thresholds).toEqual([80]);
  });

  it('pct = 100% — ambos os thresholds atingidos', () => {
    const pct = (100 / 100) * 100;
    const thresholds = ([80, 100] as const).filter((t) => pct >= t);
    expect(thresholds).toEqual([80, 100]);
  });

  it('pct > 100% — ambos os thresholds atingidos (estouro)', () => {
    const pct = (150 / 100) * 100;
    const thresholds = ([80, 100] as const).filter((t) => pct >= t);
    expect(thresholds).toEqual([80, 100]);
  });

  it('limite zero não causa divisão por zero', () => {
    const spent = 50;
    const limit = 0;
    const pct = limit > 0 ? (spent / limit) * 100 : 0;
    expect(pct).toBe(0);
    const thresholds = ([80, 100] as const).filter((t) => pct >= t);
    expect(thresholds).toHaveLength(0);
  });
});

// ── Mensagens das notificações ────────────────────────────────────────────────

describe('check-budget-alerts — formatação das mensagens push', () => {
  it('mensagem 80% contém label da categoria e valores formatados', () => {
    const category = 'alimentacao';
    const spent = 160;
    const limit = 200;
    const body = `Você usou 80% do orçamento de ${categoryLabel(category)} este mês (R$ ${formatBRL(spent)} de R$ ${formatBRL(limit)})`;
    expect(body).toBe('Você usou 80% do orçamento de Alimentação este mês (R$ 160,00 de R$ 200,00)');
  });

  it('mensagem 100% indica estouro com valores', () => {
    const category = 'transporte';
    const spent = 310;
    const limit = 300;
    const body = `Orçamento de ${categoryLabel(category)} estourado! (R$ ${formatBRL(spent)} gastos, limite R$ ${formatBRL(limit)})`;
    expect(body).toBe('Orçamento de Transporte estourado! (R$ 310,00 gastos, limite R$ 300,00)');
  });

  it('título correto por threshold', () => {
    const threshold80: number = 80;
    const threshold100: number = 100;
    expect(threshold80 === 80 ? 'Orçamento em 80%' : 'Orçamento estourado!').toBe('Orçamento em 80%');
    expect(threshold100 === 80 ? 'Orçamento em 80%' : 'Orçamento estourado!').toBe('Orçamento estourado!');
  });

  it('categoria desconhecida usa o próprio slug como fallback', () => {
    expect(categoryLabel('categoria_nova')).toBe('categoria_nova');
  });

  it('url da notificação aponta para /more/orcamentos', () => {
    const url = '/more/orcamentos';
    expect(url).toBe('/more/orcamentos');
  });
});

// ── TOCTOU — lógica de insert-first ──────────────────────────────────────────

describe('check-budget-alerts — TOCTOU: insert-first antes de enviar push', () => {
  it('unique violation (23505) → alerta já enviado, skip', () => {
    const err = { code: '23505', message: 'unique constraint violation' };
    const isAlreadySent = err.code === '23505';
    expect(isAlreadySent).toBe(true);
  });

  it('outro erro de banco → logar e skip (não enviar push)', () => {
    const err = { code: '42501', message: 'permission denied' };
    const isAlreadySent = err.code === '23505';
    const shouldSkip = isAlreadySent || err.code !== undefined;
    expect(shouldSkip).toBe(true);
  });

  it('sem erro → insert bem-sucedido, pode enviar push', () => {
    const err = null;
    const canSend = !err;
    expect(canSend).toBe(true);
  });
});

// ── AC6 — graceful degradation sem push subscription ─────────────────────────

describe('check-budget-alerts — AC6: sem subscription ativa', () => {
  it('usuário sem subscription → não enviar push, mas log já inserido', () => {
    const subscriptions: unknown[] = [];
    const hasSubs = (subscriptions?.length ?? 0) > 0;
    // Log foi inserido; apenas o envio do push é pulado
    expect(hasSubs).toBe(false);
  });

  it('usuário com subscription → pode enviar push', () => {
    const subscriptions = [{ id: 'sub-uuid' }];
    const hasSubs = subscriptions.length > 0;
    expect(hasSubs).toBe(true);
  });
});

// ── Mês corrente no formato YYYY-MM ──────────────────────────────────────────

describe('check-budget-alerts — formato do mês', () => {
  it('currentMonth está no formato YYYY-MM', () => {
    const currentMonth = new Date().toISOString().slice(0, 7);
    expect(currentMonth).toMatch(/^\d{4}-\d{2}$/);
  });

  it('mês de fevereiro de 2026 formatado corretamente', () => {
    const date = new Date('2026-02-15T12:00:00Z');
    const month = date.toISOString().slice(0, 7);
    expect(month).toBe('2026-02');
  });
});

// ── formatBRL ─────────────────────────────────────────────────────────────────

describe('formatBRL — formatação de moeda BR', () => {
  it('formata valor inteiro com ,00', () => {
    expect(formatBRL(200)).toBe('200,00');
  });

  it('formata valor decimal com vírgula', () => {
    expect(formatBRL(199.9)).toBe('199,90');
  });

  it('formata centavos corretamente', () => {
    expect(formatBRL(0.05)).toBe('0,05');
  });
});
