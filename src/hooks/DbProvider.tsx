import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { initDatabase } from '@/src/db/database';
import {
  exportBackupToShareSheet,
  pickAndImportBackup,
} from '@/src/db/backup';
import {
  addDebt,
  addGoal,
  addTransaction,
  completeOnboarding,
  contributeToGoal,
  deleteCategory,
  deleteDebt,
  deleteGoal,
  deleteTransaction,
  getCategoriesWithSpend,
  getSettings,
  listDebts,
  listGoals,
  listTransactions,
  loadSampleData as seedSampleData,
  logDebtPayment,
  monthlyExpenseTotals,
  monthlyIncomeTotals,
  resetAllData,
  updateDebt,
  updateGoal,
  updateSettings,
  updateTransaction,
  upsertCategory,
} from '@/src/db/repositories';
import { AppSettings, CategoryWithSpend, Debt, Goal, TintName } from '@/src/db/types';

type GoalInput = {
  id?: string;
  name: string;
  icon: string;
  targetCents: number;
  savedCents?: number;
  dueDate?: string | null;
};

type DebtInput = {
  id?: string;
  name: string;
  balanceCents: number;
  originalBalanceCents?: number;
  paymentCents: number;
  dueDate?: string | null;
};

type DbContextValue = {
  ready: boolean;
  settings: AppSettings | null;
  categories: CategoryWithSpend[];
  goals: Goal[];
  debts: Debt[];
  refresh: () => Promise<void>;
  finishOnboarding: (opts: {
    aiConsent: boolean;
    templateId: string;
    displayName?: string;
    categories?: { name: string; icon: string; tint: TintName; capCents: number }[];
  }) => Promise<void>;
  logExpense: (opts: {
    categoryId: string;
    amountCents: number;
    note?: string;
    date?: string;
  }) => Promise<void>;
  logIncome: (opts: { amountCents: number; note?: string; date?: string }) => Promise<void>;
  saveCategory: (opts: {
    id?: string;
    name: string;
    icon: string;
    tint: TintName;
    capCents: number;
    sortOrder?: number;
  }) => Promise<string>;
  removeCategory: (id: string) => Promise<void>;
  saveGoal: (input: GoalInput) => Promise<string>;
  removeGoal: (id: string) => Promise<void>;
  contributeGoal: (id: string, amountCents: number) => Promise<void>;
  saveDebt: (input: DebtInput) => Promise<string>;
  removeDebt: (id: string) => Promise<void>;
  payDebt: (id: string, amountCents: number) => Promise<void>;
  saveTransaction: (input: {
    id: string;
    categoryId?: string | null;
    amountCents: number;
    note?: string;
    date: string;
    type: 'expense' | 'income';
  }) => Promise<void>;
  removeTransaction: (id: string) => Promise<void>;
  exportBackup: () => Promise<void>;
  importBackup: () => Promise<'canceled' | 'imported'>;
  resetData: () => Promise<void>;
  setSetting: (partial: Partial<{
    displayName: string;
    currency: string;
    aiConsent: number;
    capAlertThreshold: number;
  }>) => Promise<void>;
  /** Opt-in demo data. Pass force to replace goals/debts/transactions. */
  loadSampleData: (opts?: { force?: boolean }) => Promise<void>;
  incomeTransactions: Awaited<ReturnType<typeof listTransactions>>;
  history: { month: string; totalCents: number }[];
  incomeHistory: { month: string; totalCents: number }[];
};

const DbContext = createContext<DbContextValue | null>(null);

export function DbProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [categories, setCategories] = useState<CategoryWithSpend[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [incomeTransactions, setIncomeTransactions] = useState<
    Awaited<ReturnType<typeof listTransactions>>
  >([]);
  const [history, setHistory] = useState<{ month: string; totalCents: number }[]>([]);
  const [incomeHistory, setIncomeHistory] = useState<{ month: string; totalCents: number }[]>([]);

  const refresh = useCallback(async () => {
    const [s, cats, g, d, income, hist, incomeHist] = await Promise.all([
      getSettings(),
      getCategoriesWithSpend(),
      listGoals(),
      listDebts(),
      listTransactions({ type: 'income', limit: 50 }),
      monthlyExpenseTotals(6),
      monthlyIncomeTotals(6),
    ]);
    setSettings(s);
    setCategories(cats);
    setGoals(g);
    setDebts(d);
    setIncomeTransactions(income);
    setHistory(hist);
    setIncomeHistory(incomeHist);
  }, []);

  useEffect(() => {
    (async () => {
      await initDatabase();
      // Do not auto-seed — empty goals/debts/txns until the user logs data or loads samples.
      await refresh();
      setReady(true);
    })().catch(console.error);
  }, [refresh]);

  const value = useMemo<DbContextValue>(
    () => ({
      ready,
      settings,
      categories,
      goals,
      debts,
      refresh,
      finishOnboarding: async (opts) => {
        await completeOnboarding(opts);
        await refresh();
      },
      logExpense: async (opts) => {
        await addTransaction({
          categoryId: opts.categoryId,
          amountCents: opts.amountCents,
          note: opts.note,
          date: opts.date,
          type: 'expense',
        });
        await refresh();
      },
      logIncome: async (opts) => {
        await addTransaction({
          amountCents: opts.amountCents,
          note: opts.note,
          date: opts.date,
          type: 'income',
        });
        await refresh();
      },
      saveCategory: async (opts) => {
        const id = await upsertCategory(opts);
        await refresh();
        return id;
      },
      removeCategory: async (id) => {
        await deleteCategory(id);
        await refresh();
      },
      saveGoal: async (input) => {
        if (input.id) {
          await updateGoal({
            id: input.id,
            name: input.name,
            icon: input.icon,
            targetCents: input.targetCents,
            savedCents: input.savedCents ?? 0,
            dueDate: input.dueDate,
          });
          await refresh();
          return input.id;
        }
        const id = await addGoal(input);
        await refresh();
        return id;
      },
      removeGoal: async (id) => {
        await deleteGoal(id);
        await refresh();
      },
      contributeGoal: async (id, amountCents) => {
        await contributeToGoal(id, amountCents);
        await refresh();
      },
      saveDebt: async (input) => {
        if (input.id) {
          const existing = (await listDebts()).find((d) => d.id === input.id);
          await updateDebt({
            id: input.id,
            name: input.name,
            balanceCents: input.balanceCents,
            originalBalanceCents:
              input.originalBalanceCents ??
              existing?.originalBalanceCents ??
              input.balanceCents,
            paymentCents: input.paymentCents,
            dueDate: input.dueDate,
          });
          await refresh();
          return input.id;
        }
        const id = await addDebt(input);
        await refresh();
        return id;
      },
      removeDebt: async (id) => {
        await deleteDebt(id);
        await refresh();
      },
      payDebt: async (id, amountCents) => {
        await logDebtPayment(id, amountCents);
        await refresh();
      },
      saveTransaction: async (input) => {
        await updateTransaction(input);
        await refresh();
      },
      removeTransaction: async (id) => {
        await deleteTransaction(id);
        await refresh();
      },
      exportBackup: async () => {
        await exportBackupToShareSheet();
      },
      importBackup: async () => {
        const result = await pickAndImportBackup();
        if (result === 'imported') {
          await refresh();
        }
        return result;
      },
      resetData: async () => {
        await resetAllData();
        await refresh();
      },
      setSetting: async (partial) => {
        await updateSettings(partial);
        await refresh();
      },
      loadSampleData: async (opts) => {
        await seedSampleData(opts);
        await refresh();
      },
      incomeTransactions,
      history,
      incomeHistory,
    }),
    [ready, settings, categories, goals, debts, refresh, incomeTransactions, history, incomeHistory],
  );

  return <DbContext.Provider value={value}>{children}</DbContext.Provider>;
}

export function useDb() {
  const ctx = useContext(DbContext);
  if (!ctx) throw new Error('useDb must be used within DbProvider');
  return ctx;
}
