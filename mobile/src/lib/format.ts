import { colors, typography, TintName, tintPalette } from '@/src/theme/theme';

function showsCurrencyDecimals(currencySymbol: string): boolean {
  return currencySymbol === 'USD' || currencySymbol === '$' || currencySymbol === '€';
}

/** Integer cents → the amount in the display currency (pesos, dollars, euros). */
export function currencyAmount(cents: number, currencySymbol = 'RD$'): number {
  const sign = cents < 0 ? -1 : 1;
  const abs = Math.abs(cents);
  const amount = showsCurrencyDecimals(currencySymbol)
    ? Math.round(abs) / 100
    : Math.floor(abs / 100);
  return sign * amount;
}

/**
 * Format an amount stored as integer cents.
 * RD$ shows whole pesos (common for local budgeting); USD/EUR-style symbols show 2 decimals.
 */
export function formatMoney(cents: number, currencySymbol = 'RD$'): string {
  const negative = cents < 0;
  const abs = Math.abs(currencyAmount(cents, currencySymbol));
  const formatted = showsCurrencyDecimals(currencySymbol)
    ? abs.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : abs.toLocaleString('en-US');
  return `${negative ? '-' : ''}${currencySymbol}${formatted}`;
}

export function parseMoneyInput(raw: string): number {
  const cleaned = raw.replace(/[^\d.]/g, '');
  if (!cleaned) return 0;
  const value = Number.parseFloat(cleaned);
  if (Number.isNaN(value)) return 0;
  return Math.round(value * 100);
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function formatDisplayDate(date = new Date()): string {
  return date
    .toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    })
    .toUpperCase();
}

export function formatShortDate(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function daysLeftInMonth(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate() - d.getDate() + 1;
}

export function hasMonthlyCap(capCents: number): boolean {
  return capCents > 0;
}

export function progressRatio(spentCents: number, capCents: number): number {
  if (capCents <= 0) return 0;
  return Math.min(1, Math.max(0, spentCents / capCents));
}

export function tintForProgress(progress: number, preferred: TintName = 'teal'): TintName {
  if (progress >= 1) return 'coral';
  if (progress >= 0.8) return 'gold';
  return preferred;
}

export function ringColor(tint: TintName): string {
  return tintPalette[tint][500];
}

export function ringTrackColor(tint: TintName): string {
  const map = {
    teal: 'rgba(34,211,238,0.18)',
    gold: 'rgba(245,166,35,0.18)',
    plum: 'rgba(139,92,246,0.18)',
    coral: 'rgba(251,68,99,0.18)',
  } as const;
  return map[tint];
}

export const font = {
  display: typography.display,
  displayMedium: typography.displayMedium,
  ui: typography.ui,
  uiMedium: typography.uiMedium,
  uiSemiBold: typography.uiSemiBold,
  uiBold: typography.uiBold,
} as const;

export { colors };
