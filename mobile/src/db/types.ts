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

export type BudgetTemplate = {
  id: string;
  name: string;
  description: string;
  categories: { name: string; icon: string; tint: TintName; capCents: number }[];
};
