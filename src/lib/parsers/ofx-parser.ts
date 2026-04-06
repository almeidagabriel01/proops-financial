import type { ParsedTransaction } from './types';

/**
 * Parses OFX (SGML format) bank statement files.
 * OFX is NOT valid XML — leaf elements have no closing tags.
 */
export function parseOFX(content: string): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];

  // Normalize line endings
  const normalized = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Find all STMTTRN blocks
  const blockRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi;
  let match: RegExpExecArray | null;

  // Track FITID occurrences to handle duplicates within the same file
  const fitIdCount = new Map<string, number>();

  while ((match = blockRegex.exec(normalized)) !== null) {
    const block = match[1];

    const trnType = extractField(block, 'TRNTYPE');
    const dtPosted = extractField(block, 'DTPOSTED');
    const trnAmt = extractField(block, 'TRNAMT');
    const fitId = extractField(block, 'FITID');
    const name = extractField(block, 'NAME') || extractField(block, 'MEMO');

    if (!dtPosted || !trnAmt || !fitId) continue;

    const date = parseOFXDate(dtPosted);
    const amount = parseFloat(trnAmt);

    if (isNaN(amount)) continue;

    // OFX: positive = credit, negative = debit
    // If TRNTYPE is available, use it to confirm direction
    let type: 'credit' | 'debit';
    if (trnType.toUpperCase() === 'CREDIT') {
      type = 'credit';
    } else if (trnType.toUpperCase() === 'DEBIT') {
      type = 'debit';
    } else {
      type = amount >= 0 ? 'credit' : 'debit';
    }

    // Deduplicate FITIDs within the same file (some banks reuse the same FITID
    // for distinct transactions, e.g. Nubank rotativo charges)
    const count = fitIdCount.get(fitId) ?? 0;
    fitIdCount.set(fitId, count + 1);
    const externalId = count === 0 ? fitId : `${fitId}_${count + 1}`;

    transactions.push({
      external_id: externalId,
      date,
      description: name,
      amount,
      type,
    });
  }

  if (transactions.length === 0) {
    throw new Error('No transactions found in OFX file');
  }

  return transactions;
}

function extractField(block: string, tag: string): string {
  const regex = new RegExp(`<${tag}>([^<\\r\\n]+)`, 'i');
  const match = block.match(regex);
  return match ? match[1].trim() : '';
}

function parseOFXDate(dtposted: string): string {
  // Format: YYYYMMDDHHMMSS or YYYYMMDDHHMMSS[offset:zone] or YYYYMMDD
  const dateStr = dtposted.replace(/\[.*?\]/, '').trim();
  const year = dateStr.substring(0, 4);
  const month = dateStr.substring(4, 6);
  const day = dateStr.substring(6, 8);
  return `${year}-${month}-${day}`;
}
