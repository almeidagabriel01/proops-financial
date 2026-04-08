import { describe, it, expect } from 'vitest';
import { detectBankFormat, parseRowWithFormat } from '@/lib/parsers/bank-formats/index';
import { isNubankFormat, parseNubankRow } from '@/lib/parsers/bank-formats/nubank';

describe('detectBankFormat', () => {
  it('detecta Nubank', () => {
    expect(detectBankFormat(['Data', 'Valor', 'Descrição'])).toBe('nubank');
  });

  it('detecta Nubank com variante titulo', () => {
    expect(detectBankFormat(['data', 'valor', 'titulo'])).toBe('nubank');
  });

  it('detecta Itaú', () => {
    expect(detectBankFormat(['Data', 'Valor', 'Histórico', 'Tipo'])).toBe('itau');
  });

  it('detecta Bradesco', () => {
    expect(detectBankFormat(['Dt. Lançamento', 'Histórico', 'Crédito (R$)', 'Débito (R$)'])).toBe(
      'bradesco',
    );
  });

  it('retorna generic para headers desconhecidos', () => {
    expect(detectBankFormat(['foo', 'bar', 'baz'])).toBe('generic');
  });
});

describe('parseRowWithFormat — generic', () => {
  it('parseia linha genérica com campos data, desc e valor', () => {
    const row = { data: '2024-01-15', descricao: 'Supermercado', valor: '-150.00' };
    const result = parseRowWithFormat('generic', row);
    expect(result).not.toBeNull();
    expect(result?.date).toBe('2024-01-15');
    expect(result?.description).toBe('Supermercado');
    expect(result?.amount).toBe(-150);
    expect(result?.type).toBe('debit');
  });

  it('parseia linha genérica com crédito', () => {
    const row = { date: '2024-02-01', memo: 'Salário', amount: '5000.00' };
    const result = parseRowWithFormat('generic', row);
    expect(result).not.toBeNull();
    expect(result?.amount).toBe(5000);
    expect(result?.type).toBe('credit');
  });

  it('retorna null quando campos obrigatórios estão ausentes', () => {
    const row = { foo: 'bar' };
    expect(parseRowWithFormat('generic', row)).toBeNull();
  });

  it('retorna null quando valor não é número', () => {
    const row = { data: '2024-01-01', desc: 'Teste', valor: 'NaN' };
    expect(parseRowWithFormat('generic', row)).toBeNull();
  });

  it('delega para nubank quando format=nubank', () => {
    const row = { Data: '2024-01-15', Valor: '-50.00', Descrição: 'iFood' };
    const result = parseRowWithFormat('nubank', row);
    expect(result?.description).toBe('iFood');
    expect(result?.amount).toBe(-50);
  });

  it('delega para itau quando format=itau', () => {
    // Itaú uses specific column names
    const row = {
      Data: '15/01/2024',
      Valor: '100,00',
      Histórico: 'PIX recebido',
      'Tipo do Lançamento': 'C',
    };
    const result = parseRowWithFormat('itau', row);
    expect(result).not.toBeNull();
  });

  it('delega para bradesco quando format=bradesco', () => {
    const row = {
      'Dt. Lançamento': '15/01/2024',
      Histórico: 'Pagamento',
      'Crédito (R$)': '',
      'Débito (R$)': '100,00',
    };
    const result = parseRowWithFormat('bradesco', row);
    expect(result).not.toBeNull();
  });
});

describe('isNubankFormat', () => {
  it('retorna true para headers Nubank padrão', () => {
    expect(isNubankFormat(['Data', 'Valor', 'Descrição'])).toBe(true);
  });

  it('retorna true para variante sem acento', () => {
    expect(isNubankFormat(['data', 'valor', 'descricao'])).toBe(true);
  });

  it('retorna false para headers sem campo obrigatório', () => {
    expect(isNubankFormat(['Data', 'Valor'])).toBe(false);
  });
});

describe('parseNubankRow — variantes de chave', () => {
  it('usa chave "titulo" quando "Descrição" está ausente', () => {
    const row = { data: '2024-03-01', valor: '-10.00', titulo: 'Netflix' };
    const result = parseNubankRow(row);
    expect(result.description).toBe('Netflix');
  });

  it('usa chave "Título" (maiúsculo com acento)', () => {
    const row = { Data: '2024-03-01', Valor: '-10.00', Título: 'Spotify' };
    const result = parseNubankRow(row);
    expect(result.description).toBe('Spotify');
  });

  it('usa chave "title" como fallback final', () => {
    const row = { Data: '2024-03-01', Valor: '-10.00', title: 'Amazon' };
    const result = parseNubankRow(row);
    expect(result.description).toBe('Amazon');
  });

  it('usa chave minúscula "descricao"', () => {
    const row = { data: '2024-03-01', valor: '-10.00', descricao: 'Farmácia' };
    const result = parseNubankRow(row);
    expect(result.description).toBe('Farmácia');
  });
});

describe('parseNubankRow — date formats', () => {
  it('aceita data no formato YYYY-MM-DD', () => {
    const row = { Data: '2024-03-15', Valor: '-25.50', Descrição: 'Café' };
    const result = parseNubankRow(row);
    expect(result.date).toBe('2024-03-15');
  });

  it('converte data no formato DD/MM/YYYY', () => {
    const row = { Data: '15/03/2024', Valor: '-25.50', Descrição: 'Café' };
    const result = parseNubankRow(row);
    expect(result.date).toBe('2024-03-15');
  });

  it('preserva data em formato desconhecido', () => {
    const row = { Data: '15-03-2024', Valor: '-10', Descrição: 'Teste' };
    const result = parseNubankRow(row);
    expect(result.date).toBe('15-03-2024');
  });
});
