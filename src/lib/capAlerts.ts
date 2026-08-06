import { CategoryWithSpend } from '@/src/db/types';
import { progressRatio } from '@/src/lib/format';

export const CAP_ALERT_OPTIONS = [50, 80, 90, 100] as const;

export type CapAlertLevel = 'ok' | 'warning' | 'over';

export function capAlertLevel(cat: CategoryWithSpend, thresholdPct: number): CapAlertLevel {
  if (cat.capCents <= 0) return 'ok';
  const pct = progressRatio(cat.spentCents, cat.capCents) * 100;
  if (pct >= 100) return 'over';
  if (pct >= thresholdPct) return 'warning';
  return 'ok';
}

export function categoriesAtAlert(
  categories: CategoryWithSpend[],
  thresholdPct: number,
): CategoryWithSpend[] {
  return categories.filter((c) => {
    const level = capAlertLevel(c, thresholdPct);
    return level === 'warning' || level === 'over';
  });
}
