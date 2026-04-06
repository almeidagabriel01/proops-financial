import type { ParsedTransaction } from '../types';
import { generateExternalId } from '../utils';

// Nubank CSV format (NuConta / credit card)
// Headers: Data,Valor,Descrição
// Date: YYYY-MM-DD
// Amount: decimal dot, negative=debit, positive=credit

export function isNubankFormat(headers: string[]): boolean {
  const lower = headers.map((h) => h.toLowerCase().trim());
  return (
    lower.includes('data') &&
    lower.includes('valor') &&
    (lower.includes('descrição') || lower.includes('descricao') || lower.includes('título') || lower.includes('titulo'))
  );
}

export function parseNubankRow(row: Record<string, string>): ParsedTransaction {
  const dateRaw = (row['Data'] ?? row['data'] ?? '').trim();
  const amountRaw = (row['Valor'] ?? row['valor'] ?? '').trim();
  const descRaw =
    row['Descrição'] ??
    row['descricao'] ??
    row['Descrição'] ??
    row['Título'] ??
    row['titulo'] ??
    row['title'] ??
    '';

  const date = parseDateISO(dateRaw);
  const amount = parseFloat(amountRaw.replace(',', '.'));
  const description = descRaw.trim();
  const type: 'credit' | 'debit' = amount >= 0 ? 'credit' : 'debit';

  return {
    external_id: generateExternalId(date, amount, description),
    date,
    description,
    amount,
    type,
  };
}

function parseDateISO(raw: string): string {
  // Accepts YYYY-MM-DD or DD/MM/YYYY
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) {
    const [d, m, y] = raw.split('/');
    return `${y}-${m}-${d}`;
  }
  return raw;
}
