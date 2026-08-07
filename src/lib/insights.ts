import { CategoryWithSpend } from '@/src/db/types';
import { capAlertLevel } from '@/src/lib/capAlerts';
import { formatMoney, progressRatio } from '@/src/lib/format';

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

/**
 * Cap-limit alerts only (actual spend vs cap threshold).
 * No pace projection or AI inference — those come later.
 */
export function buildInsights(
  categories: CategoryWithSpend[],
  currency: string,
  thresholdPct = 80,
): InsightCard[] {
  const over: InsightCard[] = [];
  const warning: InsightCard[] = [];

  for (const cat of categories) {
    if (cat.capCents <= 0) continue;
    const level = capAlertLevel(cat, thresholdPct);
    if (level === 'ok') continue;

    const pct = Math.round(progressRatio(cat.spentCents, cat.capCents) * 100);
    const actions: InsightAction[] = [
      { id: 'adjust-cap', label: 'Adjust cap', href: `/category/${cat.id}` },
      { id: 'cap-alerts', label: 'Cap alerts', href: '/(tabs)/settings' },
    ];

    if (level === 'over') {
      const overBy = cat.spentCents - cat.capCents;
      over.push({
        id: `over-${cat.id}`,
        tone: 'coral',
        eyebrow: 'Over cap',
        body: `${cat.name} is ${formatMoney(overBy, currency)} over its ${formatMoney(cat.capCents, currency)} monthly cap (${formatMoney(cat.spentCents, currency)} spent).`,
        actions,
      });
    } else {
      const room = cat.capCents - cat.spentCents;
      warning.push({
        id: `warn-${cat.id}`,
        tone: 'gold',
        eyebrow: 'Cap alert',
        body: `${cat.name} is at ${pct}% of its cap — ${formatMoney(cat.spentCents, currency)} of ${formatMoney(cat.capCents, currency)}, with ${formatMoney(room, currency)} left.`,
        actions,
      });
    }
  }

  const cards = [...over, ...warning].slice(0, 4);

  if (cards.length === 0) {
    cards.push({
      id: 'empty',
      tone: 'plum',
      eyebrow: 'No cap alerts',
      body: 'You’re under your alert thresholds for now. Warnings show here when a category hits the % you set in Settings.',
      actions: [{ id: 'settings', label: 'Cap alerts', href: '/(tabs)/settings' }],
    });
  }

  return cards;
}
