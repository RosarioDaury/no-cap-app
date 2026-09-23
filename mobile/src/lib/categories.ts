import { monthKey, nextMonthKey, formatMonthName } from '@/src/lib/bills';

export type CategoryDuration = 'ongoing' | 'this-month' | 'next-month' | 'custom';

export function durationFromActiveMonth(activeMonth: string | null): CategoryDuration {
  if (!activeMonth) return 'ongoing';
  if (activeMonth === monthKey()) return 'this-month';
  if (activeMonth === nextMonthKey()) return 'next-month';
  return 'custom';
}

export function activeMonthFromDuration(
  duration: CategoryDuration,
  customMonth?: string | null,
): string | null {
  if (duration === 'this-month') return monthKey();
  if (duration === 'next-month') return nextMonthKey();
  if (duration === 'custom') return customMonth ?? null;
  return null;
}

export function isCategoryActiveThisMonth(activeMonth: string | null, now = new Date()): boolean {
  return !activeMonth || activeMonth === monthKey(now);
}

export function categoryDurationLabel(activeMonth: string | null): string {
  if (!activeMonth) return 'Ongoing';
  const current = monthKey();
  const next = nextMonthKey();
  if (activeMonth === current) return 'This month only';
  if (activeMonth === next) return 'Next month only';
  if (activeMonth < current) return `${formatMonthName(activeMonth)} only · ended`;
  return `${formatMonthName(activeMonth)} only`;
}

export function durationChoiceLabel(duration: CategoryDuration): string {
  if (duration === 'this-month') return 'This month only';
  if (duration === 'next-month') return 'Next month only';
  if (duration === 'custom') return 'One month only';
  return 'Ongoing';
}

export function cycleCategoryDuration(duration: CategoryDuration): CategoryDuration {
  if (duration === 'ongoing') return 'this-month';
  if (duration === 'this-month') return 'next-month';
  return 'ongoing';
}
