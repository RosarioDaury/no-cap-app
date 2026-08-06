import { CategoryWithSpend, Debt } from '@/src/db/types';
import { formatMoney } from '@/src/lib/format';

export type InsightAction = {
  id: string;
  label: string;
  href: string;
};

export type InsightCard = {
  id: string;
  tone: 'coral' | 'teal' | 'gold' | 'plum';
  eyebrow: string;
  body: string;
  actions: InsightAction[];
};

export function buildInsights(
  categories: CategoryWithSpend[],
  debts: Debt[],
  currency: string,
): InsightCard[] {
  const cards: InsightCard[] = [];
  const day = new Date().getDate();
  const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
  const pace = day / daysInMonth;

  for (const cat of categories) {
    if (cat.capCents <= 0) continue;
    const expectedSpend = cat.capCents * pace;
    const projected = pace > 0 ? cat.spentCents / pace : cat.spentCents;
    const overBy = projected - cat.capCents;
    if (overBy > cat.capCents * 0.05 && cat.spentCents > expectedSpend) {
      cards.push({
        id: `over-${cat.id}`,
        tone: 'coral',
        eyebrow: 'Projected overspend',
        body: `${cat.name} is on pace to close ~${formatMoney(Math.round(overBy), currency)} over cap, based on your pace so far this month.`,
        actions: [
          { id: 'adjust-cap', label: 'Adjust cap', href: `/category/${cat.id}` },
          { id: 'cap-alerts', label: 'Cap alerts', href: '/(tabs)/settings' },
        ],
      });
    } else if (cat.spentCents < cat.capCents * 0.55 && pace > 0.4) {
      cards.push({
        id: `room-${cat.id}`,
        tone: 'teal',
        eyebrow: 'Consistent room',
        body: `${cat.name} is tracking under cap — you have about ${formatMoney(cat.capCents - cat.spentCents, currency)} of room left.`,
        actions: [{ id: 'goals', label: 'Move to a goal', href: '/(tabs)/goals' }],
      });
    }
  }

  for (const debt of debts) {
    if (debt.paymentCents <= 0 || debt.balanceCents <= 0) continue;
    const months = Math.ceil(debt.balanceCents / debt.paymentCents);
    const boost = debt.paymentCents + 100000;
    const faster = Math.ceil(debt.balanceCents / boost);
    cards.push({
      id: `debt-${debt.id}`,
      tone: 'gold',
      eyebrow: 'Debt payoff',
      body: `At ${formatMoney(debt.paymentCents, currency)}/month, ${debt.name.toLowerCase()} clears in ${months} months. Adding ${formatMoney(100000, currency)} cuts that to ${faster}.`,
      actions: [{ id: 'payoff', label: 'See payoff plan', href: '/debt' }],
    });
  }

  if (cards.length === 0) {
    cards.push({
      id: 'empty',
      tone: 'plum',
      eyebrow: 'Getting started',
      body: 'Log a few expenses and set caps — pattern insights show up once there is enough local data.',
      actions: [{ id: 'log', label: 'Log a spend', href: '/add-expense' }],
    });
  }

  return cards.slice(0, 4);
}
