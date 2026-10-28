import { CategoryWithSpend, BillWithStatus, Debt, Goal } from '@/src/db/types';
import { capAlertLevel } from '@/src/lib/capAlerts';
import { currencyAmount, daysLeftInMonth, hasMonthlyCap, todayISO } from '@/src/lib/format';
import { monthKey } from '@/src/lib/bills';

export type SpendSnapshotV2 = {
  v: 2;
  currency: string;
  as_of: string;
  month: string;
  days_left: number;
  income: number;
  spend: number;
  capped_spend: number;
  total_cap: number;
  categories: {
    id: string;
    name: string;
    cap: number;
    spent: number;
    unlimited: boolean;
  }[];
  monthly_spend: { month: string; total: number }[];
  monthly_income: { month: string; total: number }[];
  goals: { id: string; name: string; target: number; saved: number }[];
  debts: { id: string; name: string; balance: number; payment: number }[];
  bills: {
    id: string;
    name: string;
    amount: number;
    due_day: number;
    paid_this_month: boolean;
    days_until_due: number;
  }[];
  facts: {
    id: string;
    type: string;
    category_id: string | null;
    amount: number | null;
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
}): SpendSnapshotV2 {
  const month = monthKey();
  const money = (cents: number) => currencyAmount(cents, input.currency);
  const capped = input.categories.filter((c) => hasMonthlyCap(c.capCents));
  const facts: SpendSnapshotV2['facts'] = [];

  for (const cat of capped) {
    const level = capAlertLevel(cat, input.threshold);
    if (level === 'ok') continue;
    const remaining = cat.capCents - cat.spentCents;
    facts.push({
      id: `${level}-${cat.id}`,
      type: level === 'over' ? 'over_cap' : 'threshold',
      category_id: cat.id,
      amount: money(level === 'over' ? Math.abs(remaining) : cat.spentCents),
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
      amount: money(debt.balanceCents),
      label: `${debt.name} clears in about ${months} month${months === 1 ? '' : 's'} at the current payment`,
    });
  }

  const incomeThisMonth =
    input.incomeHistory.find((h) => h.month === month)?.totalCents ?? 0;
  const spendThisMonth = input.categories.reduce((s, c) => s + c.spentCents, 0);

  return {
    v: 2,
    currency: input.currency,
    as_of: todayISO(),
    month,
    days_left: daysLeftInMonth(),
    income: money(incomeThisMonth),
    spend: money(spendThisMonth),
    capped_spend: money(capped.reduce((s, c) => s + c.spentCents, 0)),
    total_cap: money(capped.reduce((s, c) => s + c.capCents, 0)),
    categories: input.categories.slice(0, 40).map((c) => ({
      id: c.id,
      name: c.name,
      cap: money(c.capCents),
      spent: money(c.spentCents),
      unlimited: !hasMonthlyCap(c.capCents),
    })),
    monthly_spend: input.history.map((h) => ({ month: h.month, total: money(h.totalCents) })),
    monthly_income: input.incomeHistory.map((h) => ({
      month: h.month,
      total: money(h.totalCents),
    })),
    goals: input.goals.slice(0, 20).map((g) => ({
      id: g.id,
      name: g.name,
      target: money(g.targetCents),
      saved: money(g.savedCents),
    })),
    debts: input.debts.slice(0, 20).map((d) => ({
      id: d.id,
      name: d.name,
      balance: money(d.balanceCents),
      payment: money(d.paymentCents),
    })),
    bills: input.bills.slice(0, 30).map((b) => ({
      id: b.id,
      name: b.name,
      amount: money(b.amountCents),
      due_day: b.dueDay,
      paid_this_month: b.paidThisMonth,
      days_until_due: b.daysUntilDue,
    })),
    facts: facts.slice(0, 20),
  };
}
