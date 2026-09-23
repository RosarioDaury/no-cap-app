export type TintName = 'teal' | 'gold' | 'plum' | 'coral';

export type ThemeMode = 'dark' | 'light';

export type AppSettings = {
  displayName: string;
  currency: string;
  aiConsent: number;
  onboardingComplete: number;
  capAlertThreshold: number;
  theme: ThemeMode;
};

export type Category = {
  id: string;
  name: string;
  icon: string;
  tint: TintName;
  capCents: number;
  sortOrder: number;
  activeMonth: string | null;
};

export type CategoryWithSpend = Category & {
  spentCents: number;
};

export type Transaction = {
  id: string;
  categoryId: string | null;
  amountCents: number;
  note: string;
  date: string;
  type: 'expense' | 'income';
};

export type Goal = {
  id: string;
  name: string;
  icon: string;
  targetCents: number;
  savedCents: number;
  dueDate: string | null;
};

export type Debt = {
  id: string;
  name: string;
  balanceCents: number;
  originalBalanceCents: number;
  paymentCents: number;
  dueDate: string | null;
};

export type Bill = {
  id: string;
  name: string;
  amountCents: number;
  dueDay: number;
  reminderDaysBefore: number;
  reminderHour: number;
  categoryId: string | null;
  notes: string;
  remindersEnabled: number;
};

export type BillPayment = {
  id: string;
  billId: string;
  month: string;
  amountCents: number;
  paidAt: string;
  transactionId: string | null;
};

export type BillWithStatus = Bill & {
  paidThisMonth: boolean;
  paidAmountCents: number;
  dueDateISO: string;
  daysUntilDue: number;
};

export type BudgetTemplate = {
  id: string;
  name: string;
  description: string;
  categories: { name: string; icon: string; tint: TintName; capCents: number }[];
};
