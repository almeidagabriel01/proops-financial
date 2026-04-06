import type { ParsedTransaction } from '../types';
import { generateExternalId } from '../utils';

// Bradesco CSV format
// Headers: Data;Histórico;Docto.;Crédito (R$);Débito (R$);Saldo (R$)
// Date: DD/MM/YYYY
// Separate credit and debit columns (comma decimal)

export function isBradescoFormat(headers: string[]): boolean {
  const lower = headers.map((h) => h.toLowerCase().trim());
  return lower.some((h) => h.includes('crédito') || h.includes('credito')) &&
    lower.some((h) => h.includes('débito') || h.includes('debito'));
}

export function parseBradescoRow(row: Record<string, string>): ParsedTransaction | null {
  const dateRaw = (row['Data'] ?? row['data'] ?? '').trim();
  const descRaw = (row['Histórico'] ?? row['Historico'] ?? row['histórico'] ?? row['historico'] ?? '').trim();

  const creditKey = Object.keys(row).find((k) =>
    k.toLowerCase().includes('crédito') || k.toLowerCase().includes('credito'),
  );
  const debitKey = Object.keys(row).find((k) =>
    k.toLowerCase().includes('débito') || k.toLowerCase().includes('debito'),
  );

  const creditRaw = creditKey ? row[creditKey].trim() : '';
  const debitRaw = debitKey ? row[debitKey].trim() : '';

  const creditAmount = creditRaw ? parseAmountBR(creditRaw) : 0;
  const debitAmount = debitRaw ? parseAmountBR(debitRaw) : 0;

  // Skip rows with no amount (e.g. balance rows)
  if (creditAmount === 0 && debitAmount === 0) return null;

  const date = parseDateBR(dateRaw);
  const description = descRaw;

  let amount: number;
  let type: 'credit' | 'debit';

  if (creditAmount > 0) {
    amount = creditAmount;
    type = 'credit';
  } else {
    amount = -debitAmount;
    type = 'debit';
  }

  return {
    external_id: generateExternalId(date, amount, description),
    date,
    description,
    amount,
    type,
  };
}

function parseDateBR(raw: string): string {
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) {
    const [d, m, y] = raw.split('/');
    return `${y}-${m}-${d}`;
  }
  return raw;
}

function parseAmountBR(raw: string): number {
  if (!raw) return 0;
  const cleaned = raw.replace(/\./g, '').replace(',', '.');
  const value = parseFloat(cleaned);
  return isNaN(value) ? 0 : Math.abs(value);
}
