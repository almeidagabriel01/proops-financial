import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  normalizeDescription,
  formatCurrency,
  formatDate,
  formatDateShort,
  formatDateRelative,
  getMonthBounds,
  getPrevMonthBounds,
  groupByWeek,
  currentYM,
  maskCurrency,
  initCurrencyMask,
  parseCurrencyMask,
} from '@/lib/utils/format';

describe('normalizeDescription', () => {
  it('converte para minúsculas', () => {
    expect(normalizeDescription('SUPERMERCADO')).toBe('supermercado');
  });

  it('remove acentos', () => {
    expect(normalizeDescription('Alimentação')).toBe('alimentacao');
  });

  it('remove caracteres especiais', () => {
    expect(normalizeDescription('iFood*PEDIDO123')).toBe('ifoodpedido123');
  });

  it('colapsa múltiplos espaços', () => {
    expect(normalizeDescription('PIX  TRANSFERENCIA   BANCO')).toBe('pix transferencia banco');
  });

  it('remove espaços nas bordas', () => {
    expect(normalizeDescription('  supermercado  ')).toBe('supermercado');
  });

  it('combina todas as transformações', () => {
    // "—" é removido, espaços colapsados
    expect(normalizeDescription('  Pão de Açúcar — S/A  ')).toBe('pao de acucar sa');
  });
});

describe('formatCurrency', () => {
  it('formata valor positivo em BRL', () => {
    const result = formatCurrency(1234.56);
    expect(result).toContain('1.234,56');
    expect(result).toContain('R$');
  });

  it('formata valor negativo em BRL', () => {
    const result = formatCurrency(-500);
    expect(result).toContain('500');
  });

  it('formata zero', () => {
    const result = formatCurrency(0);
    expect(result).toContain('0,00');
  });

  it('formata valores sem centavos', () => {
    const result = formatCurrency(100);
    expect(result).toContain('100,00');
  });
});

describe('formatDate', () => {
  it('formata data no padrão pt-BR (DD/MM/YYYY)', () => {
    const result = formatDate('2024-03-15');
    expect(result).toContain('15');
    expect(result).toContain('03');
    expect(result).toContain('2024');
  });
});

describe('formatDateShort', () => {
  it('formata data curta sem ponto', () => {
    const result = formatDateShort('2024-03-15');
    // Should be like "15 mar" without trailing dot
    expect(result).not.toContain('.');
    expect(result).toContain('15');
  });
});

describe('formatDateRelative', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('retorna "hoje" para data de hoje', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-03-15T10:00:00'));
    expect(formatDateRelative('2024-03-15')).toBe('hoje');
  });

  it('retorna "ontem" para data de ontem', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-03-15T10:00:00'));
    expect(formatDateRelative('2024-03-14')).toBe('ontem');
  });

  it('retorna data curta para datas anteriores', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-03-15T10:00:00'));
    const result = formatDateRelative('2024-03-10');
    expect(result).toContain('10');
  });
});

describe('getMonthBounds', () => {
  it('retorna início e fim do mês correto', () => {
    const { start, end } = getMonthBounds(new Date('2024-03-15'));
    expect(start).toBe('2024-03-01');
    expect(end).toBe('2024-03-31');
  });

  it('lida com fevereiro (ano bissexto)', () => {
    const { start, end } = getMonthBounds(new Date('2024-02-15'));
    expect(start).toBe('2024-02-01');
    expect(end).toBe('2024-02-29');
  });

  it('lida com fevereiro (ano não bissexto)', () => {
    const { start, end } = getMonthBounds(new Date('2023-02-10'));
    expect(start).toBe('2023-02-01');
    expect(end).toBe('2023-02-28');
  });

  it('usa a data atual quando nenhuma data é passada', () => {
    const { start, end } = getMonthBounds();
    const now = new Date();
    const expectedStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    expect(start).toBe(expectedStart);
    expect(end.startsWith(String(now.getFullYear()))).toBe(true);
  });
});

describe('getPrevMonthBounds', () => {
  it('retorna bounds do mês anterior', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-03-15'));
    const { start, end } = getPrevMonthBounds();
    expect(start).toBe('2024-02-01');
    expect(end).toBe('2024-02-29'); // 2024 é bissexto
    vi.useRealTimers();
  });

  it('lida com virada de ano (janeiro → dezembro do ano anterior)', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-15'));
    const { start, end } = getPrevMonthBounds();
    expect(start).toBe('2023-12-01');
    expect(end).toBe('2023-12-31');
    vi.useRealTimers();
  });
});

describe('currentYM', () => {
  it('retorna string no formato YYYY-MM', () => {
    const result = currentYM();
    expect(result).toMatch(/^\d{4}-\d{2}$/);
  });
});

describe('maskCurrency', () => {
  it('formata string de dígitos como moeda BR', () => {
    expect(maskCurrency('150000')).toBe('1.500,00');
  });

  it('retorna string vazia quando não há dígitos', () => {
    expect(maskCurrency('')).toBe('');
    expect(maskCurrency('abc')).toBe('');
  });

  it('remove caracteres não numéricos antes de formatar', () => {
    expect(maskCurrency('R$ 1.000,00')).toBe('1.000,00');
  });
});

describe('initCurrencyMask', () => {
  it('converte valor numérico para máscara', () => {
    expect(initCurrencyMask(15)).toBe('15,00');
  });

  it('retorna string vazia para valor nulo', () => {
    expect(initCurrencyMask(null)).toBe('');
  });

  it('retorna string vazia para zero', () => {
    expect(initCurrencyMask(0)).toBe('');
  });

  it('retorna string vazia para valor negativo', () => {
    expect(initCurrencyMask(-10)).toBe('');
  });
});

describe('parseCurrencyMask', () => {
  it('converte string mascarada para número', () => {
    expect(parseCurrencyMask('1.500,00')).toBe(1500);
  });

  it('retorna 0 para string vazia', () => {
    expect(parseCurrencyMask('')).toBe(0);
  });

  it('lida com valor simples sem separador de milhar', () => {
    expect(parseCurrencyMask('50,00')).toBe(50);
  });
});

describe('groupByWeek', () => {
  it('agrupa transações por semana', () => {
    const txs = [
      { date: '2024-03-01', amount: 100, type: 'credit' as const },
      { date: '2024-03-07', amount: 50, type: 'debit' as const },
      { date: '2024-03-08', amount: 200, type: 'credit' as const },
    ];
    const result = groupByWeek(txs);
    expect(result.length).toBeGreaterThanOrEqual(1);
    const sem1 = result.find((w) => w.week === 'Sem 1');
    expect(sem1?.receitas).toBe(100);
  });

  it('acumula receitas e despesas na mesma semana', () => {
    const txs = [
      { date: '2024-03-05', amount: 1000, type: 'credit' as const },
      { date: '2024-03-06', amount: -300, type: 'debit' as const },
      { date: '2024-03-07', amount: -150, type: 'debit' as const },
    ];
    const result = groupByWeek(txs);
    const sem1 = result.find((w) => w.week === 'Sem 1');
    expect(sem1?.receitas).toBe(1000);
    expect(sem1?.despesas).toBe(450);
  });

  it('retorna array vazio para input vazio', () => {
    expect(groupByWeek([])).toEqual([]);
  });

  it('ordena semanas alfabeticamente', () => {
    const txs = [
      { date: '2024-03-22', amount: 100, type: 'credit' as const },
      { date: '2024-03-01', amount: 50, type: 'credit' as const },
    ];
    const result = groupByWeek(txs);
    expect(result[0].week).toBe('Sem 1');
  });
});
