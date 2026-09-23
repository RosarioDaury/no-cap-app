import { CategoryWithSpend, BillWithStatus, Debt, Goal } from '@/src/db/types';
import { capAlertLevel } from '@/src/lib/capAlerts';
import { daysLeftInMonth, hasMonthlyCap, todayISO } from '@/src/lib/format';
import { monthKey } from '@/src/lib/bills';

export type SpendSnapshotV1 = {
  v: 1;
  currency: string;
  as_of: string;
  month: string;
  days_left: number;
  income_cents: number;
  spend_cents: number;
  capped_spend_cents: number;
  total_cap_cents: number;
  categories: {
    id: string;
    name: string;
    cap_cents: number;
    spent_cents: number;
    unlimited: boolean;
  }[];
  monthly_spend: { month: string; total_cents: number }[];
  monthly_income: { month: string; total_cents: number }[];
  goals: { id: string; name: string; target_cents: number; saved_cents: number }[];
  debts: { id: string; name: string; balance_cents: number; payment_cents: number }[];
  bills: {
    id: string;
    name: string;
    amount_cents: number;
    due_day: number;
    paid_this_month: boolean;
    days_until_due: number;
  }[];
  facts: {
    id: string;
    type: string;
    category_id: string | null;
    amount_cents: number | null;
    label: string;
  }[];
};

export function buildSpendSnapshot(input: {
  currency: string;
  threshold: number;
  categories: CategoryWithSpend[];
  history: { month: string; totalCents: number }[];
  incomeHistory: { month: string; totalCents: number }[];
  goals: Goal[];
  debts: Debt[];
  bills: BillWithStatus[];
}): SpendSnapshotV1 {
  const month = monthKey();
  const capped = input.categories.filter((c) => hasMonthlyCap(c.capCents));
  const facts: SpendSnapshotV1['facts'] = [];

  for (const cat of capped) {
    const level = capAlertLevel(cat, input.threshold);
    if (level === 'ok') continue;
    const remaining = cat.capCents - cat.spentCents;
    facts.push({
      id: `${level}-${cat.id}`,
      type: level === 'over' ? 'over_cap' : 'threshold',
      category_id: cat.id,
      amount_cents: level === 'over' ? Math.abs(remaining) : cat.spentCents,
      label:
        level === 'over'
          ? `${cat.name} is over cap`
          : `${cat.name} is near its monthly cap`,
    });
  }

  for (const debt of input.debts.slice(0, 8)) {
    if (debt.paymentCents <= 0) continue;
    const months = Math.ceil(debt.balanceCents / debt.paymentCents);
    facts.push({
      id: `debt-${debt.id}`,
      type: 'debt_payoff',
      category_id: null,
      amount_cents: debt.balanceCents,
      label: `${debt.name} clears in about ${months} month${months === 1 ? '' : 's'} at the current payment`,
    });
  }

  const incomeThisMonth =
    input.incomeHistory.find((h) => h.month === month)?.totalCents ?? 0;
  const spendThisMonth = input.categories.reduce((s, c) => s + c.spentCents, 0);

  return {
    v: 1,
    currency: input.currency,
    as_of: todayISO(),
    month,
    days_left: daysLeftInMonth(),
    income_cents: incomeThisMonth,
    spend_cents: spendThisMonth,
    capped_spend_cents: capped.reduce((s, c) => s + c.spentCents, 0),
    total_cap_cents: capped.reduce((s, c) => s + c.capCents, 0),
    categories: input.categories.slice(0, 40).map((c) => ({
      id: c.id,
      name: c.name,
      cap_cents: c.capCents,
      spent_cents: c.spentCents,
      unlimited: !hasMonthlyCap(c.capCents),
    })),
    monthly_spend: input.history.map((h) => ({ month: h.month, total_cents: h.totalCents })),
    monthly_income: input.incomeHistory.map((h) => ({
      month: h.month,
      total_cents: h.totalCents,
    })),
    goals: input.goals.slice(0, 20).map((g) => ({
      id: g.id,
      name: g.name,
      target_cents: g.targetCents,
      saved_cents: g.savedCents,
    })),
    debts: input.debts.slice(0, 20).map((d) => ({
      id: d.id,
      name: d.name,
      balance_cents: d.balanceCents,
      payment_cents: d.paymentCents,
    })),
    bills: input.bills.slice(0, 30).map((b) => ({
      id: b.id,
      name: b.name,
      amount_cents: b.amountCents,
      due_day: b.dueDay,
      paid_this_month: b.paidThisMonth,
      days_until_due: b.daysUntilDue,
    })),
    facts: facts.slice(0, 20),
  };
}
