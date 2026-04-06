import type { ParsedTransaction } from '../types';
import { isNubankFormat, parseNubankRow } from './nubank';
import { isItauFormat, parseItauRow } from './itau';
import { isBradescoFormat, parseBradescoRow } from './bradesco';
import { generateExternalId } from '../utils';

export type BankFormat = 'nubank' | 'itau' | 'bradesco' | 'generic';

export function detectBankFormat(headers: string[]): BankFormat {
  if (isBradescoFormat(headers)) return 'bradesco';
  if (isItauFormat(headers)) return 'itau';
  if (isNubankFormat(headers)) return 'nubank';
  return 'generic';
}

export function parseRowWithFormat(
  format: BankFormat,
  row: Record<string, string>,
): ParsedTransaction | null {
  switch (format) {
    case 'nubank':
      return parseNubankRow(row);
    case 'itau':
      return parseItauRow(row);
    case 'bradesco':
      return parseBradescoRow(row);
    case 'generic':
      return parseGenericRow(row);
  }
}

function parseGenericRow(row: Record<string, string>): ParsedTransaction | null {
  const keys = Object.keys(row);

  const dateKey = keys.find((k) => /data|date/i.test(k));
  const descKey = keys.find((k) => /desc|hist|name|memo|title/i.test(k));
  const amountKey = keys.find((k) => /valor|value|amount/i.test(k));

  if (!dateKey || !descKey || !amountKey) return null;

  const dateRaw = row[dateKey].trim();
  const description = row[descKey].trim();
  const amountRaw = row[amountKey].trim().replace(',', '.');

  const date = dateRaw;
  const amount = parseFloat(amountRaw);

  if (isNaN(amount) || !date || !description) return null;

  const type: 'credit' | 'debit' = amount >= 0 ? 'credit' : 'debit';

  return {
    external_id: generateExternalId(date, amount, description),
    date,
    description,
    amount,
    type,
  };
}
