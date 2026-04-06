import { createHash } from 'crypto';

export function normalizeDescription(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, ' ');
}

export function generateExternalId(date: string, amount: number, description: string): string {
  const normalized = normalizeDescription(description);
  const input = `${date}|${amount}|${normalized}`;
  return createHash('sha256').update(input).digest('hex');
}
