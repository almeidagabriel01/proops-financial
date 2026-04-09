/**
 * Gerador de parcelas futuras.
 * A partir de um grupo de parcelas e da parcela atual, gera os agendamentos futuros.
 */

export interface InstallmentGroup {
  id: string;
  user_id: string;
  bank_account_id: string;
  description: string;
  installment_count: number;
  installment_amount: number;
  first_date: string; // YYYY-MM-DD
  category: string;
}

export interface ScheduledInstallment {
  user_id: string;
  bank_account_id: string;
  description: string;
  amount: number;
  type: 'debit';
  category: string;
  due_date: string; // YYYY-MM-DD
  status: 'pending';
  installment_group_id: string;
  installment_number: number;
}

/**
 * Adiciona N meses a uma data sem mudar o dia (ou ajusta para último dia do mês).
 * Ex: 2024-01-31 + 1 mês = 2024-02-29 (ajustado)
 */
export function addMonths(dateStr: string, months: number): string {
  const date = new Date(dateStr + 'T12:00:00Z');
  const day = date.getUTCDate();
  date.setUTCMonth(date.getUTCMonth() + months);

  // Ajustar se o mês não tem o mesmo dia (ex: 31 jan + 1 = 28 fev)
  if (date.getUTCDate() !== day) {
    date.setUTCDate(0); // último dia do mês anterior
  }

  return date.toISOString().slice(0, 10);
}

/**
 * Gera os agendamentos de parcelas futuras (da próxima até a última).
 *
 * @param group - Grupo de parcelas já criado no banco
 * @param currentInstallmentNumber - Número da parcela já importada/paga (ex: 3)
 * @returns Array de scheduled_transactions a inserir
 */
export function generateFutureInstallments(
  group: InstallmentGroup,
  currentInstallmentNumber: number
): ScheduledInstallment[] {
  const scheduled: ScheduledInstallment[] = [];

  for (let n = currentInstallmentNumber + 1; n <= group.installment_count; n++) {
    // Quantos meses após a first_date é esta parcela
    const monthsOffset = n - 1; // parcela 1 = first_date, parcela 2 = first_date + 1 mês, etc.
    const dueDate = addMonths(group.first_date, monthsOffset);

    scheduled.push({
      user_id: group.user_id,
      bank_account_id: group.bank_account_id,
      description: `${group.description} (${n}/${group.installment_count})`,
      amount: group.installment_amount,
      type: 'debit',
      category: group.category,
      due_date: dueDate,
      status: 'pending',
      installment_group_id: group.id,
      installment_number: n,
    });
  }

  return scheduled;
}
