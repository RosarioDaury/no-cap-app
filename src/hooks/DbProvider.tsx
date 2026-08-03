import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { initDatabase } from '@/src/db/database';
import {
  addTransaction,
  completeOnboarding,
  getCategoriesWithSpend,
  getSettings,
  listDebts,
  listGoals,
  listTransactions,
  monthlyExpenseTotals,
  seedDemoDataIfEmpty,
  updateSettings,
  upsertCategory,
} from '@/src/db/repositories';
import { AppSettings, CategoryWithSpend, Debt, Goal, TintName } from '@/src/db/types';

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
  setSetting: (partial: Partial<{
    displayName: string;
    currency: string;
    aiConsent: number;
    capAlertThreshold: number;
  }>) => Promise<void>;
  incomeTransactions: Awaited<ReturnType<typeof listTransactions>>;
  history: { month: string; totalCents: number }[];
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

  const refresh = useCallback(async () => {
    const [s, cats, g, d, income, hist] = await Promise.all([
      getSettings(),
      getCategoriesWithSpend(),
      listGoals(),
      listDebts(),
      listTransactions({ type: 'income', limit: 50 }),
      monthlyExpenseTotals(6),
    ]);
    setSettings(s);
    setCategories(cats);
    setGoals(g);
    setDebts(d);
    setIncomeTransactions(income);
    setHistory(hist);
  }, []);

  useEffect(() => {
    (async () => {
      await initDatabase();
      const s = await getSettings();
      if (s.onboardingComplete) {
        await seedDemoDataIfEmpty();
      }
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
      setSetting: async (partial) => {
        await updateSettings(partial);
        await refresh();
      },
      incomeTransactions,
      history,
    }),
    [ready, settings, categories, goals, debts, refresh, incomeTransactions, history],
  );

  return <DbContext.Provider value={value}>{children}</DbContext.Provider>;
}

export function useDb() {
  const ctx = useContext(DbContext);
  if (!ctx) throw new Error('useDb must be used within DbProvider');
  return ctx;
}
