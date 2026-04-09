/**
 * Recurring rule instance generator.
 * Given a recurring rule and a date range, generates the scheduled_transaction
 * instances that should exist within that range.
 */

import { addMonths } from '@/lib/installments/generator';

export type RecurringFrequency = 'weekly' | 'biweekly' | 'monthly' | 'annual';

export interface RecurringRuleInput {
  id: string;
  user_id: string;
  bank_account_id: string;
  description: string;
  amount: number;
  type: 'credit' | 'debit';
  category: string;
  frequency: RecurringFrequency;
  next_due_date: string;
  end_date: string | null;
}

export interface RecurringInstance {
  description: string;
  amount: number;
  type: 'credit' | 'debit';
  category: string;
  due_date: string;
  status: 'pending';
  recurring_rule_id: string;
  bank_account_id: string;
  user_id: string;
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function advanceByFrequency(dateStr: string, frequency: RecurringFrequency): string {
  switch (frequency) {
    case 'weekly':    return addDays(dateStr, 7);
    case 'biweekly':  return addDays(dateStr, 14);
    case 'annual':    return addMonths(dateStr, 12);
    default:          return addMonths(dateStr, 1); // monthly
  }
}

/**
 * Generate scheduled transaction instances for a recurring rule within a date range.
 *
 * @param rule - The recurring rule to generate instances for
 * @param endDate - Generate instances up to and including this date (YYYY-MM-DD)
 * @returns Array of instances to insert into scheduled_transactions
 */
export function generateRecurringInstances(
  rule: RecurringRuleInput,
  endDate: string,
): RecurringInstance[] {
  const instances: RecurringInstance[] = [];
  let currentDate = rule.next_due_date;

  while (currentDate <= endDate) {
    // Respect optional end_date on the rule itself
    if (rule.end_date && currentDate > rule.end_date) break;

    instances.push({
      description: rule.description,
      amount: rule.amount,
      type: rule.type,
      category: rule.category,
      due_date: currentDate,
      status: 'pending',
      recurring_rule_id: rule.id,
      bank_account_id: rule.bank_account_id,
      user_id: rule.user_id,
    });

    currentDate = advanceByFrequency(currentDate, rule.frequency);
  }

  return instances;
}
