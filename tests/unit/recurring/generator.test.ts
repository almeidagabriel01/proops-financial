import { describe, it, expect } from 'vitest';
import { generateRecurringInstances, type RecurringRuleInput } from '@/lib/recurring/generator';

const baseRule: RecurringRuleInput = {
  id: 'rule-1',
  user_id: 'user-1',
  bank_account_id: 'acc-1',
  description: 'Aluguel',
  amount: 1500,
  type: 'debit',
  category: 'moradia',
  frequency: 'monthly',
  next_due_date: '2024-02-10',
  end_date: null,
};

describe('generateRecurringInstances', () => {
  it('generates zero instances when endDate < next_due_date', () => {
    const instances = generateRecurringInstances(baseRule, '2024-01-01');
    expect(instances).toHaveLength(0);
  });

  it('generates correct number of monthly instances', () => {
    const instances = generateRecurringInstances(baseRule, '2024-05-31');
    // Feb 10, Mar 10, Apr 10, May 10 = 4 instances
    expect(instances).toHaveLength(4);
  });

  it('each instance has the correct structure', () => {
    const instances = generateRecurringInstances(baseRule, '2024-02-28');
    expect(instances).toHaveLength(1);
    const inst = instances[0];
    expect(inst.description).toBe('Aluguel');
    expect(inst.amount).toBe(1500);
    expect(inst.type).toBe('debit');
    expect(inst.due_date).toBe('2024-02-10');
    expect(inst.recurring_rule_id).toBe('rule-1');
    expect(inst.status).toBe('pending');
  });

  it('respects rule end_date', () => {
    const ruleWithEnd: RecurringRuleInput = { ...baseRule, end_date: '2024-03-15' };
    const instances = generateRecurringInstances(ruleWithEnd, '2024-06-30');
    // Feb 10 and Mar 10 only (Apr 10 > end_date)
    expect(instances).toHaveLength(2);
    expect(instances[instances.length - 1].due_date).toBe('2024-03-10');
  });

  it('generates weekly instances', () => {
    const weeklyRule: RecurringRuleInput = {
      ...baseRule,
      frequency: 'weekly',
      next_due_date: '2024-01-01',
      description: 'Feira',
    };
    const instances = generateRecurringInstances(weeklyRule, '2024-01-29');
    // Jan 1, 8, 15, 22, 29 = 5 instances
    expect(instances).toHaveLength(5);
    expect(instances[1].due_date).toBe('2024-01-08');
  });

  it('generates biweekly instances', () => {
    const biRule: RecurringRuleInput = {
      ...baseRule,
      frequency: 'biweekly',
      next_due_date: '2024-01-01',
    };
    const instances = generateRecurringInstances(biRule, '2024-01-31');
    // Jan 1, 15, 29 = 3 instances
    expect(instances).toHaveLength(3);
  });

  it('generates annual instances', () => {
    const annualRule: RecurringRuleInput = {
      ...baseRule,
      frequency: 'annual',
      next_due_date: '2024-01-10',
      description: 'IPTU',
    };
    const instances = generateRecurringInstances(annualRule, '2026-12-31');
    // Jan 10 2024, Jan 10 2025, Jan 10 2026 = 3 instances
    expect(instances).toHaveLength(3);
    expect(instances[1].due_date).toBe('2025-01-10');
  });
});
