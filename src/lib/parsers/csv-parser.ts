import type { ParsedTransaction } from './types';
import { detectBankFormat, parseRowWithFormat } from './bank-formats/index';

/**
 * Parses CSV bank statement files with automatic delimiter and bank format detection.
 */
export function parseCSV(content: string, bankName?: string): ParsedTransaction[] {
  const lines = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');

  // Skip empty lines and find the header line
  const nonEmptyLines = lines.filter((l) => l.trim().length > 0);
  if (nonEmptyLines.length < 2) {
    throw new Error('CSV file has no data rows');
  }

  const headerLine = nonEmptyLines[0];
  const delimiter = detectDelimiter(headerLine);
  const headers = splitCSVLine(headerLine, delimiter);

  // Detect bank format from headers (or hint from bankName)
  const format = detectFormatFromBankName(bankName) ?? detectBankFormat(headers);

  const transactions: ParsedTransaction[] = [];

  for (let i = 1; i < nonEmptyLines.length; i++) {
    const line = nonEmptyLines[i].trim();
    if (!line) continue;

    const values = splitCSVLine(line, delimiter);
    const row: Record<string, string> = {};

    headers.forEach((header, idx) => {
      row[header.trim()] = values[idx]?.trim() ?? '';
    });

    try {
      const tx = parseRowWithFormat(format, row);
      if (tx) transactions.push(tx);
    } catch {
      // Skip malformed rows
    }
  }

  if (transactions.length === 0) {
    throw new Error('No transactions found in CSV file');
  }

  return transactions;
}

function detectDelimiter(line: string): ',' | ';' {
  const commaCount = (line.match(/,/g) || []).length;
  const semicolonCount = (line.match(/;/g) || []).length;
  return semicolonCount > commaCount ? ';' : ',';
}

function splitCSVLine(line: string, delimiter: ',' | ';'): string[] {
  const result: string[] = [];
  let current = '';
  let insideQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (insideQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === delimiter && !insideQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current);
  return result;
}

function detectFormatFromBankName(
  bankName?: string,
): 'nubank' | 'itau' | 'bradesco' | 'generic' | null {
  if (!bankName) return null;
  const lower = bankName.toLowerCase();
  if (lower.includes('nubank') || lower.includes('nu ')) return 'nubank';
  if (lower.includes('itau') || lower.includes('itaú')) return 'itau';
  if (lower.includes('bradesco')) return 'bradesco';
  return null;
}
