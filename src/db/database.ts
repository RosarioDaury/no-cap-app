import * as SQLite from 'expo-sqlite';
import { BudgetTemplate } from '@/src/db/types';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export function getDb() {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync('nocap.db');
  }
  return dbPromise;
}

export async function initDatabase() {
  const db = await getDb();
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      display_name TEXT NOT NULL DEFAULT 'Alex',
      currency TEXT NOT NULL DEFAULT 'RD$',
      ai_consent INTEGER NOT NULL DEFAULT 0,
      onboarding_complete INTEGER NOT NULL DEFAULT 0,
      cap_alert_threshold INTEGER NOT NULL DEFAULT 80
    );

    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      icon TEXT NOT NULL,
      tint TEXT NOT NULL,
      cap_cents INTEGER NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY NOT NULL,
      category_id TEXT,
      amount_cents INTEGER NOT NULL,
      note TEXT NOT NULL DEFAULT '',
      date TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('expense', 'income')),
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS goals (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      icon TEXT NOT NULL,
      target_cents INTEGER NOT NULL,
      saved_cents INTEGER NOT NULL DEFAULT 0,
      due_date TEXT
    );

    CREATE TABLE IF NOT EXISTS debts (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      balance_cents INTEGER NOT NULL,
      original_balance_cents INTEGER NOT NULL DEFAULT 0,
      payment_cents INTEGER NOT NULL DEFAULT 0,
      due_date TEXT
    );

    INSERT OR IGNORE INTO settings (id) VALUES (1);
  `);

  // Migrate older DBs that lack original_balance_cents
  const debtCols = await db.getAllAsync<{ name: string }>('PRAGMA table_info(debts)');
  if (!debtCols.some((c) => c.name === 'original_balance_cents')) {
    await db.execAsync(
      `ALTER TABLE debts ADD COLUMN original_balance_cents INTEGER NOT NULL DEFAULT 0;
       UPDATE debts SET original_balance_cents = balance_cents WHERE original_balance_cents = 0;`,
    );
  }

  return db;
}

export function newId(prefix = 'id'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export const BUDGET_TEMPLATES: BudgetTemplate[] = [
  {
    id: 'balanced',
    name: '50/30/20 rule',
    description: '50% needs, 30% wants, 20% savings and debt. The classic starting split.',
    categories: [
      { name: 'Groceries', icon: 'shopping-cart', tint: 'gold', capCents: 2500000 },
      { name: 'Utilities & bills', icon: 'zap', tint: 'teal', capCents: 1650000 },
      { name: 'Fun & going out', icon: 'party-popper', tint: 'plum', capCents: 1200000 },
      { name: 'Gas', icon: 'fuel', tint: 'coral', capCents: 700000 },
      { name: 'Self-care', icon: 'heart', tint: 'teal', capCents: 600000 },
    ],
  },
  {
    id: 'zero',
    name: 'Zero-based budget',
    description: 'Every peso is assigned a job. Income minus outflows equals zero.',
    categories: [
      { name: 'Groceries', icon: 'shopping-cart', tint: 'coral', capCents: 2200000 },
      { name: 'Utilities & bills', icon: 'zap', tint: 'teal', capCents: 1500000 },
      { name: 'Transport', icon: 'car', tint: 'gold', capCents: 900000 },
      { name: 'Fun & going out', icon: 'party-popper', tint: 'plum', capCents: 800000 },
      { name: 'Savings', icon: 'umbrella', tint: 'teal', capCents: 2000000 },
    ],
  },
  {
    id: 'envelope',
    name: 'Envelope method',
    description: 'Fixed cash-style limits per category, no borrowing between them.',
    categories: [
      { name: 'Groceries', icon: 'shopping-cart', tint: 'gold', capCents: 2000000 },
      { name: 'Utilities & bills', icon: 'zap', tint: 'teal', capCents: 1400000 },
      { name: 'Fun & going out', icon: 'party-popper', tint: 'coral', capCents: 700000 },
      { name: 'Self-care', icon: 'heart', tint: 'plum', capCents: 500000 },
    ],
  },
  {
    id: 'scratch',
    name: 'Start from scratch',
    description: 'Set your own categories and caps with no template.',
    categories: [
      { name: 'Groceries', icon: 'shopping-cart', tint: 'gold', capCents: 0 },
      { name: 'Utilities & bills', icon: 'zap', tint: 'teal', capCents: 0 },
      { name: 'Fun & going out', icon: 'party-popper', tint: 'plum', capCents: 0 },
    ],
  },
];
