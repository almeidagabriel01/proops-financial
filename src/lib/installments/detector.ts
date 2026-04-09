import type { ParsedTransaction } from '@/lib/parsers/types';

export interface DetectedInstallment {
  /** Índice da transação no array original */
  transactionIndex: number;
  /** Número da parcela atual (ex: 3) */
  currentNumber: number;
  /** Total de parcelas (ex: 10) */
  totalCount: number;
  /** Descrição sem o padrão de parcela */
  baseDescription: string;
}

/**
 * Patterns regex para detectar parcelas em descrições brasileiras de cartão de crédito.
 * Cada pattern captura (currentNumber, totalCount) como grupos 1 e 2.
 *
 * Exemplos suportados:
 *   "COMPRA LOJA XPTO 3/10"
 *   "COMPRA LOJA XPTO 03/10"
 *   "COMPRA LOJA XPTO 3 /10"
 *   "LOJA XPTO PARCELA 3 DE 10"
 *   "LOJA XPTO PARC 03 DE 10"
 */
const INSTALLMENT_PATTERNS: RegExp[] = [
  // "3/10" ou "03/10" — formato mais comum em extratos OFX/Nubank/Itaú
  /\b(\d{1,2})\s*\/\s*(\d{1,3})\b/,
  // "PARCELA 3 DE 10" ou "PARC 3 DE 10"
  /\bPARC(?:ELA)?\s+(\d{1,2})\s+DE\s+(\d{1,3})\b/i,
  // "3A PARCELA DE 10" — menos comum
  /\b(\d{1,2})\s*[Aa]\s+PARC(?:ELA)?\s+DE\s+(\d{1,3})\b/i,
];

/**
 * Detecta transações parceladas em um array de transações parseadas.
 * Retorna apenas as que têm padrão de parcela identificável e plausível.
 */
export function detectInstallments(
  transactions: ParsedTransaction[]
): DetectedInstallment[] {
  const results: DetectedInstallment[] = [];

  for (let i = 0; i < transactions.length; i++) {
    const tx = transactions[i];

    // Apenas débitos podem ser parcelas de cartão
    if (tx.type !== 'debit') continue;

    const detection = extractInstallmentInfo(tx.description);
    if (!detection) continue;

    const { currentNumber, totalCount, baseDescription } = detection;

    // Sanidade: parcela atual <= total, total razoável
    if (currentNumber > totalCount) continue;
    if (totalCount < 2 || totalCount > 360) continue;
    if (currentNumber < 1) continue;

    results.push({
      transactionIndex: i,
      currentNumber,
      totalCount,
      baseDescription,
    });
  }

  return results;
}

/**
 * Extrai informação de parcela de uma descrição de transação.
 * Retorna null se não encontrar padrão de parcela.
 */
export function extractInstallmentInfo(
  description: string
): { currentNumber: number; totalCount: number; baseDescription: string } | null {
  for (const pattern of INSTALLMENT_PATTERNS) {
    const match = description.match(pattern);
    if (!match) continue;

    const currentNumber = parseInt(match[1], 10);
    const totalCount = parseInt(match[2], 10);

    if (isNaN(currentNumber) || isNaN(totalCount)) continue;
    if (totalCount < 2 || totalCount > 360) continue;
    if (currentNumber < 1 || currentNumber > totalCount) continue;

    // Remove o padrão completo da descrição para obter a base
    const baseDescription = description
      .replace(match[0], '')
      .replace(/\s{2,}/g, ' ')
      .trim();

    return { currentNumber, totalCount, baseDescription };
  }

  return null;
}
