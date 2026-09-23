import { Bill, BillWithStatus } from '@/src/db/types';

export function monthKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function nextMonthKey(d = new Date()): string {
  return monthKey(new Date(d.getFullYear(), d.getMonth() + 1, 1));
}

export function formatMonthName(key: string): string {
  const year = Number(key.slice(0, 4));
  const monthIndex = Number(key.slice(5, 7)) - 1;
  if (!Number.isFinite(year) || monthIndex < 0 || monthIndex > 11) return key;
  return new Date(year, monthIndex, 1).toLocaleDateString('en-US', { month: 'long' });
}

export function startOfLocalDay(d = new Date()): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function dueDateInMonth(year: number, monthIndex: number, dueDay: number): Date {
  const last = new Date(year, monthIndex + 1, 0).getDate();
  const day = Math.min(Math.max(dueDay, 1), last);
  return new Date(year, monthIndex, day);
}

export function reminderDateForDue(due: Date, daysBefore: number, hour: number): Date {
  const reminder = new Date(due);
  reminder.setDate(reminder.getDate() - Math.max(0, daysBefore));
  reminder.setHours(hour, 0, 0, 0);
  return reminder;
}

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function daysUntil(isoDate: string, now = new Date()): number {
  const due = new Date(`${isoDate}T12:00:00`);
  const startDue = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  const startNow = startOfLocalDay(now);
  return Math.round((startDue.getTime() - startNow.getTime()) / 86_400_000);
}

export function ordinalDay(n: number): string {
  const v = n % 100;
  if (v >= 11 && v <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

export function withBillStatus(bill: Bill, paidAmountCents: number, now = new Date()): BillWithStatus {
  const due = dueDateInMonth(now.getFullYear(), now.getMonth(), bill.dueDay);
  const dueDateISO = toISODate(due);
  return {
    ...bill,
    paidThisMonth: paidAmountCents > 0,
    paidAmountCents,
    dueDateISO,
    daysUntilDue: daysUntil(dueDateISO, now),
  };
}

export function billStatusLabel(bill: BillWithStatus): string {
  if (bill.paidThisMonth) return 'Paid this month';
  if (bill.daysUntilDue < 0) return `Overdue · was the ${ordinalDay(bill.dueDay)}`;
  if (bill.daysUntilDue === 0) return 'Due today';
  if (bill.daysUntilDue === 1) return 'Due tomorrow';
  return `Due in ${bill.daysUntilDue} days · ${ordinalDay(bill.dueDay)}`;
}

export type BillOccurrence = {
  monthKey: string;
  due: Date;
  reminder: Date;
};

export function upcomingBillOccurrences(bill: Bill, count = 12, now = new Date()): BillOccurrence[] {
  const results: BillOccurrence[] = [];
  let year = now.getFullYear();
  let month = now.getMonth();
  const today = startOfLocalDay(now);

  for (let i = 0; i < count + 2 && results.length < count; i++) {
    const due = dueDateInMonth(year, month, bill.dueDay);
    const reminder = reminderDateForDue(due, bill.reminderDaysBefore, bill.reminderHour);
    const key = `${year}-${String(month + 1).padStart(2, '0')}`;
    if (due >= today) {
      results.push({ monthKey: key, due, reminder });
    }
    month += 1;
    if (month > 11) {
      month = 0;
      year += 1;
    }
  }
  return results;
}
