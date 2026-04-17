import { IRPF_FICHA, type IrpfCategory } from './category-mapping';

export interface IrpfTransaction {
  date: string;
  description: string;
  category: IrpfCategory;
  amount: number;
}

export function generateIrpfCsv(transactions: IrpfTransaction[], year: number): Buffer {
  const headers = ['Data', 'Descrição', 'Categoria', 'Ficha IRPF', 'Valor (R$)'];

  const rows = transactions.map((t) => [
    new Date(t.date).toLocaleDateString('pt-BR'),
    `"${t.description.replace(/"/g, '""')}"`,
    t.category,
    IRPF_FICHA[t.category],
    Math.abs(t.amount).toFixed(2).replace('.', ','),
  ]);

  const totalSaude = transactions
    .filter((t) => t.category === 'saude')
    .reduce((s, t) => s + Math.abs(t.amount), 0);

  const totalEducacao = transactions
    .filter((t) => t.category === 'educacao')
    .reduce((s, t) => s + Math.abs(t.amount), 0);

  const summaryRows = [
    [],
    ['TOTAIS', '', '', '', ''],
    ['', 'Despesas Médicas e de Saúde', '', '', totalSaude.toFixed(2).replace('.', ',')],
    ['', 'Instrução', '', '', totalEducacao.toFixed(2).replace('.', ',')],
  ];

  const allRows = [headers, ...rows, ...summaryRows];
  const csvContent = `Relatório IRPF ${year} — Finansim\n\n` + allRows.map((r) => r.join(';')).join('\n');

  // BOM UTF-8 para compatibilidade com Excel BR
  return Buffer.concat([Buffer.from('\uFEFF', 'utf8'), Buffer.from(csvContent, 'utf8')]);
}
