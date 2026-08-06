import { getDb, newId, BUDGET_TEMPLATES } from '@/src/db/database';
import {
  AppSettings,
  Category,
  CategoryWithSpend,
  Debt,
  Goal,
  TintName,
  Transaction,
} from '@/src/db/types';
import { todayISO } from '@/src/lib/format';

function monthStart(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

export async function getSettings(): Promise<AppSettings> {
  const db = await getDb();
  const row = await db.getFirstAsync<{
    display_name: string;
    currency: string;
    ai_consent: number;
    onboarding_complete: number;
    cap_alert_threshold: number;
  }>('SELECT * FROM settings WHERE id = 1');
  return {
    displayName: row?.display_name ?? 'Alex',
    currency: row?.currency ?? 'RD$',
    aiConsent: row?.ai_consent ?? 0,
    onboardingComplete: row?.onboarding_complete ?? 0,
    capAlertThreshold: row?.cap_alert_threshold ?? 80,
  };
}

export async function updateSettings( partial: Partial<{
  displayName: string;
  currency: string;
  aiConsent: number;
  onboardingComplete: number;
  capAlertThreshold: number;
}>) {
  const db = await getDb();
  const current = await getSettings();
  await db.runAsync(
    `UPDATE settings SET
      display_name = ?,
      currency = ?,
      ai_consent = ?,
      onboarding_complete = ?,
      cap_alert_threshold = ?
     WHERE id = 1`,
    [
      partial.displayName ?? current.displayName,
      partial.currency ?? current.currency,
      partial.aiConsent ?? current.aiConsent,
      partial.onboardingComplete ?? current.onboardingComplete,
      partial.capAlertThreshold ?? current.capAlertThreshold,
    ],
  );
}

export async function listCategories(): Promise<Category[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{
    id: string;
    name: string;
    icon: string;
    tint: TintName;
    cap_cents: number;
    sort_order: number;
  }>('SELECT * FROM categories ORDER BY sort_order ASC, name ASC');
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    icon: r.icon,
    tint: r.tint,
    capCents: r.cap_cents,
    sortOrder: r.sort_order,
  }));
}

export async function getCategory(id: string): Promise<Category | null> {
  const db = await getDb();
  const r = await db.getFirstAsync<{
    id: string;
    name: string;
    icon: string;
    tint: TintName;
    cap_cents: number;
    sort_order: number;
  }>('SELECT * FROM categories WHERE id = ?', [id]);
  if (!r) return null;
  return {
    id: r.id,
    name: r.name,
    icon: r.icon,
    tint: r.tint,
    capCents: r.cap_cents,
    sortOrder: r.sort_order,
  };
}

export async function upsertCategory(input: {
  id?: string;
  name: string;
  icon: string;
  tint: TintName;
  capCents: number;
  sortOrder?: number;
}) {
  const db = await getDb();
  const id = input.id ?? newId('cat');
  await db.runAsync(
    `INSERT INTO categories (id, name, icon, tint, cap_cents, sort_order)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       name = excluded.name,
       icon = excluded.icon,
       tint = excluded.tint,
       cap_cents = excluded.cap_cents,
       sort_order = excluded.sort_order`,
    [
      id,
      input.name,
      input.icon,
      input.tint,
      input.capCents,
      input.sortOrder ?? 0,
    ],
  );
  return id;
}

/** Deletes a category; past expenses keep their amounts with category_id set to NULL. */
export async function deleteCategory(id: string) {
  const db = await getDb();
  await db.runAsync('UPDATE transactions SET category_id = NULL WHERE category_id = ?', [id]);
  await db.runAsync('DELETE FROM categories WHERE id = ?', [id]);
}

export async function replaceCategoriesFromTemplate(templateId: string) {
  const template = BUDGET_TEMPLATES.find((t) => t.id === templateId) ?? BUDGET_TEMPLATES[1];
  const db = await getDb();
  await db.execAsync('DELETE FROM transactions; DELETE FROM categories;');
  for (let i = 0; i < template.categories.length; i++) {
    const c = template.categories[i];
    await upsertCategory({
      name: c.name,
      icon: c.icon,
      tint: c.tint,
      capCents: c.capCents,
      sortOrder: i,
    });
  }
}

export async function getCategoriesWithSpend(month = monthStart()): Promise<CategoryWithSpend[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{
    id: string;
    name: string;
    icon: string;
    tint: TintName;
    cap_cents: number;
    sort_order: number;
    spent: number | null;
  }>(
    `SELECT c.*, COALESCE(SUM(CASE WHEN t.type = 'expense' AND t.date >= ? THEN t.amount_cents ELSE 0 END), 0) AS spent
     FROM categories c
     LEFT JOIN transactions t ON t.category_id = c.id
     GROUP BY c.id
     ORDER BY c.sort_order ASC`,
    [month],
  );
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    icon: r.icon,
    tint: r.tint,
    capCents: r.cap_cents,
    sortOrder: r.sort_order,
    spentCents: r.spent ?? 0,
  }));
}

export async function addTransaction(input: {
  categoryId?: string | null;
  amountCents: number;
  note?: string;
  date?: string;
  type: 'expense' | 'income';
}) {
  const db = await getDb();
  const id = newId('txn');
  await db.runAsync(
    `INSERT INTO transactions (id, category_id, amount_cents, note, date, type)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.categoryId ?? null,
      input.amountCents,
      input.note ?? '',
      input.date ?? todayISO(),
      input.type,
    ],
  );
  return id;
}

export async function updateTransaction(input: {
  id: string;
  categoryId?: string | null;
  amountCents: number;
  note?: string;
  date: string;
  type: 'expense' | 'income';
}) {
  const db = await getDb();
  await db.runAsync(
    `UPDATE transactions SET
      category_id = ?,
      amount_cents = ?,
      note = ?,
      date = ?,
      type = ?
     WHERE id = ?`,
    [
      input.categoryId ?? null,
      input.amountCents,
      input.note ?? '',
      input.date,
      input.type,
      input.id,
    ],
  );
}

export async function deleteTransaction(id: string) {
  const db = await getDb();
  await db.runAsync('DELETE FROM transactions WHERE id = ?', [id]);
}

export async function listTransactions(opts?: {
  categoryId?: string;
  type?: 'expense' | 'income';
  limit?: number;
}): Promise<(Transaction & { categoryName?: string })[]> {
  const db = await getDb();
  const clauses: string[] = [];
  const params: (string | number)[] = [];
  if (opts?.categoryId) {
    clauses.push('t.category_id = ?');
    params.push(opts.categoryId);
  }
  if (opts?.type) {
    clauses.push('t.type = ?');
    params.push(opts.type);
  }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const limit = opts?.limit ?? 100;
  const rows = await db.getAllAsync<{
    id: string;
    category_id: string | null;
    amount_cents: number;
    note: string;
    date: string;
    type: 'expense' | 'income';
    category_name: string | null;
  }>(
    `SELECT t.*, c.name AS category_name
     FROM transactions t
     LEFT JOIN categories c ON c.id = t.category_id
     ${where}
     ORDER BY t.date DESC, t.id DESC
     LIMIT ?`,
    [...params, limit],
  );
  return rows.map((r) => ({
    id: r.id,
    categoryId: r.category_id,
    amountCents: r.amount_cents,
    note: r.note,
    date: r.date,
    type: r.type,
    categoryName: r.category_name ?? undefined,
  }));
}

function monthKeyFromDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** Last `months` calendar months (oldest → newest), including zeros. */
export async function monthlyExpenseTotals(
  months = 6,
): Promise<{ month: string; totalCents: number }[]> {
  const db = await getDb();
  const now = new Date();
  const keys: string[] = [];
  for (let i = months - 1; i >= 0; i -= 1) {
    keys.push(monthKeyFromDate(new Date(now.getFullYear(), now.getMonth() - i, 1)));
  }
  const start = `${keys[0]}-01`;
  const endDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const end = `${keys[keys.length - 1]}-${String(endDay).padStart(2, '0')}`;

  const rows = await db.getAllAsync<{ month: string; total: number }>(
    `SELECT substr(date, 1, 7) AS month, SUM(amount_cents) AS total
     FROM transactions
     WHERE type = 'expense' AND date >= ? AND date <= ?
     GROUP BY substr(date, 1, 7)`,
    [start, end],
  );
  const byMonth = new Map(rows.map((r) => [r.month, r.total]));
  return keys.map((month) => ({ month, totalCents: byMonth.get(month) ?? 0 }));
}

export async function listGoals(): Promise<Goal[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{
    id: string;
    name: string;
    icon: string;
    target_cents: number;
    saved_cents: number;
    due_date: string | null;
  }>('SELECT * FROM goals ORDER BY CASE WHEN due_date IS NULL THEN 1 ELSE 0 END, due_date ASC, name ASC');
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    icon: r.icon,
    targetCents: r.target_cents,
    savedCents: r.saved_cents,
    dueDate: r.due_date,
  }));
}

export async function addGoal(input: {
  name: string;
  icon: string;
  targetCents: number;
  savedCents?: number;
  dueDate?: string | null;
}) {
  const db = await getDb();
  const id = newId('goal');
  await db.runAsync(
    `INSERT INTO goals (id, name, icon, target_cents, saved_cents, due_date)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, input.name, input.icon, input.targetCents, input.savedCents ?? 0, input.dueDate ?? null],
  );
  return id;
}

export async function updateGoal(input: {
  id: string;
  name: string;
  icon: string;
  targetCents: number;
  savedCents: number;
  dueDate?: string | null;
}) {
  const db = await getDb();
  await db.runAsync(
    `UPDATE goals SET
      name = ?,
      icon = ?,
      target_cents = ?,
      saved_cents = ?,
      due_date = ?
     WHERE id = ?`,
    [
      input.name,
      input.icon,
      input.targetCents,
      input.savedCents,
      input.dueDate ?? null,
      input.id,
    ],
  );
}

export async function contributeToGoal(id: string, amountCents: number) {
  if (amountCents <= 0) return;
  const db = await getDb();
  await db.runAsync(
    `UPDATE goals SET saved_cents = saved_cents + ? WHERE id = ?`,
    [amountCents, id],
  );
}

export async function deleteGoal(id: string) {
  const db = await getDb();
  await db.runAsync('DELETE FROM goals WHERE id = ?', [id]);
}

export async function listDebts(): Promise<Debt[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{
    id: string;
    name: string;
    balance_cents: number;
    original_balance_cents: number | null;
    payment_cents: number;
    due_date: string | null;
  }>('SELECT * FROM debts ORDER BY name ASC');
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    balanceCents: r.balance_cents,
    originalBalanceCents: r.original_balance_cents || r.balance_cents,
    paymentCents: r.payment_cents,
    dueDate: r.due_date,
  }));
}

export async function addDebt(input: {
  name: string;
  balanceCents: number;
  paymentCents: number;
  dueDate?: string | null;
  originalBalanceCents?: number;
}) {
  const db = await getDb();
  const id = newId('debt');
  const original = input.originalBalanceCents ?? input.balanceCents;
  await db.runAsync(
    `INSERT INTO debts (id, name, balance_cents, original_balance_cents, payment_cents, due_date)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, input.name, input.balanceCents, original, input.paymentCents, input.dueDate ?? null],
  );
  return id;
}

export async function updateDebt(input: {
  id: string;
  name: string;
  balanceCents: number;
  originalBalanceCents: number;
  paymentCents: number;
  dueDate?: string | null;
}) {
  const db = await getDb();
  await db.runAsync(
    `UPDATE debts SET
      name = ?,
      balance_cents = ?,
      original_balance_cents = ?,
      payment_cents = ?,
      due_date = ?
     WHERE id = ?`,
    [
      input.name,
      input.balanceCents,
      input.originalBalanceCents,
      input.paymentCents,
      input.dueDate ?? null,
      input.id,
    ],
  );
}

/** Reduces balance by payment amount (floors at 0). Does not change original balance. */
export async function logDebtPayment(id: string, amountCents: number) {
  if (amountCents <= 0) return;
  const db = await getDb();
  await db.runAsync(
    `UPDATE debts SET balance_cents = MAX(0, balance_cents - ?) WHERE id = ?`,
    [amountCents, id],
  );
}

export async function deleteDebt(id: string) {
  const db = await getDb();
  await db.runAsync('DELETE FROM debts WHERE id = ?', [id]);
}

/**
 * Opt-in sample data for demos. Never called automatically after onboarding.
 * Keeps existing categories. With `force`, clears goals/debts/transactions first.
 */
export async function loadSampleData(opts?: { force?: boolean }) {
  const force = opts?.force ?? false;
  const db = await getDb();

  if (force) {
    await db.execAsync('DELETE FROM transactions; DELETE FROM goals; DELETE FROM debts;');
  }

  let categories = await listCategories();
  if (categories.length === 0) {
    await replaceCategoriesFromTemplate('balanced');
    categories = await listCategories();
  }

  if ((await listGoals()).length === 0) {
    await addGoal({
      name: 'Emergency fund',
      icon: 'umbrella',
      targetCents: 10000000,
      savedCents: 6200000,
      dueDate: '2026-12-31',
    });
    await addGoal({
      name: 'Pay off credit card',
      icon: 'credit-card',
      targetCents: 5000000,
      savedCents: 1400000,
      dueDate: '2027-03-31',
    });
  }

  if ((await listDebts()).length === 0) {
    await addDebt({
      name: 'Credit card',
      balanceCents: 3600000,
      originalBalanceCents: 5000000,
      paymentCents: 400000,
      dueDate: '2026-08-15',
    });
  }

  if ((await listTransactions({ limit: 1 })).length === 0) {
    const byName = Object.fromEntries(categories.map((c) => [c.name, c.id]));
    const samples: { name: string; amount: number; note: string; daysAgo: number }[] = [
      { name: 'Groceries', amount: 125000, note: 'Weekly market run', daysAgo: 1 },
      { name: 'Groceries', amount: 80000, note: 'Corner store', daysAgo: 4 },
      { name: 'Utilities & bills', amount: 910000, note: 'Electric + water', daysAgo: 6 },
      { name: 'Fun & going out', amount: 350000, note: 'Dinner out', daysAgo: 2 },
      { name: 'Fun & going out', amount: 220000, note: 'Concert tickets', daysAgo: 8 },
      { name: 'Gas', amount: 250000, note: 'Fill-up', daysAgo: 3 },
      { name: 'Self-care', amount: 180000, note: 'Haircut', daysAgo: 10 },
    ];
    for (const s of samples) {
      if (!byName[s.name]) continue;
      const d = new Date();
      d.setDate(d.getDate() - s.daysAgo);
      await addTransaction({
        categoryId: byName[s.name],
        amountCents: s.amount,
        note: s.note,
        date: d.toISOString().slice(0, 10),
        type: 'expense',
      });
    }
    const groceryId = byName['Groceries'];
    if (groceryId) {
      const prior = Math.max(0, 2050000 - 125000 - 80000);
      if (prior > 0) {
        await addTransaction({
          categoryId: groceryId,
          amountCents: prior,
          note: 'Prior grocery spend',
          date: monthStart(),
          type: 'expense',
        });
      }
    }
    await addTransaction({
      amountCents: 8500000,
      note: 'Salary',
      type: 'income',
      date: monthStart(),
    });
  }
}

export async function completeOnboarding(opts: {
  aiConsent: boolean;
  templateId: string;
  categories?: { name: string; icon: string; tint: TintName; capCents: number }[];
  displayName?: string;
}) {
  const db = await getDb();
  await db.execAsync(
    'DELETE FROM transactions; DELETE FROM categories; DELETE FROM goals; DELETE FROM debts;',
  );
  const template = BUDGET_TEMPLATES.find((t) => t.id === opts.templateId) ?? BUDGET_TEMPLATES[0];
  const source = opts.categories?.length
    ? opts.categories
    : template.categories.map((c) => ({
        name: c.name,
        icon: c.icon,
        tint: c.tint,
        capCents: c.capCents,
      }));
  for (let i = 0; i < source.length; i++) {
    const c = source[i];
    await upsertCategory({
      name: c.name,
      icon: c.icon,
      tint: c.tint,
      capCents: c.capCents,
      sortOrder: i,
    });
  }
  // No sample seed — user starts clean. Use Settings → Load sample data.
  await updateSettings({
    aiConsent: opts.aiConsent ? 1 : 0,
    onboardingComplete: 1,
    displayName: opts.displayName ?? 'Alex',
  });
}
