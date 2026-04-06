import type { ParsedTransaction } from '../types';
import { generateExternalId } from '../utils';

// Itaú CSV format
// Headers: Data;Histórico;Valor
// Date: DD/MM/YYYY
// Amount: comma decimal (e.g. -50,00), negative=debit, positive=credit

export function isItauFormat(headers: string[]): boolean {
  const lower = headers.map((h) => h.toLowerCase().trim());
  return (
    lower.includes('data') &&
    (lower.includes('histórico') || lower.includes('historico')) &&
    lower.includes('valor') &&
    !lower.some((h) => h.includes('crédito') || h.includes('credito') || h.includes('débito') || h.includes('debito'))
  );
}

export function parseItauRow(row: Record<string, string>): ParsedTransaction {
  const dateRaw = (row['Data'] ?? row['data'] ?? '').trim();
  const descRaw = (row['Histórico'] ?? row['Historico'] ?? row['histórico'] ?? row['historico'] ?? '').trim();
  const amountRaw = (row['Valor'] ?? row['valor'] ?? '').trim();

  const date = parseDateBR(dateRaw);
  const amount = parseAmountBR(amountRaw);
  const description = descRaw;
  const type: 'credit' | 'debit' = amount >= 0 ? 'credit' : 'debit';

  return {
    external_id: generateExternalId(date, amount, description),
    date,
    description,
    amount,
    type,
  };
}

function parseDateBR(raw: string): string {
  // DD/MM/YYYY → YYYY-MM-DD
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) {
    const [d, m, y] = raw.split('/');
    return `${y}-${m}-${d}`;
  }
  return raw;
}

function parseAmountBR(raw: string): number {
  // Brazilian format: "3.000,00" or "-50,00"
  const cleaned = raw.replace(/\./g, '').replace(',', '.');
  return parseFloat(cleaned);
}
