import { getDb, newId, BUDGET_TEMPLATES } from '@/src/db/database';
import {
  AppSettings,
  Bill,
  BillPayment,
  BillWithStatus,
  Category,
  CategoryWithSpend,
  Debt,
  Goal,
  ThemeMode,
  TintName,
  Transaction,
} from '@/src/db/types';
import { todayISO } from '@/src/lib/format';
import { monthKey, withBillStatus } from '@/src/lib/bills';

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
    theme: string | null;
  }>('SELECT * FROM settings WHERE id = 1');
  const theme: ThemeMode = row?.theme === 'light' ? 'light' : 'dark';
  return {
    displayName: row?.display_name ?? 'Alex',
    currency: row?.currency ?? 'RD$',
    aiConsent: row?.ai_consent ?? 0,
    onboardingComplete: row?.onboarding_complete ?? 0,
    capAlertThreshold: row?.cap_alert_threshold ?? 80,
    theme,
  };
}

export async function updateSettings(
  partial: Partial<{
    displayName: string;
    currency: string;
    aiConsent: number;
    onboardingComplete: number;
    capAlertThreshold: number;
    theme: ThemeMode;
  }>,
) {
  const db = await getDb();
  const current = await getSettings();
  await db.runAsync(
    `UPDATE settings SET
      display_name = ?,
      currency = ?,
      ai_consent = ?,
      onboarding_complete = ?,
      cap_alert_threshold = ?,
      theme = ?
     WHERE id = 1`,
    [
      partial.displayName ?? current.displayName,
      partial.currency ?? current.currency,
      partial.aiConsent ?? current.aiConsent,
      partial.onboardingComplete ?? current.onboardingComplete,
      partial.capAlertThreshold ?? current.capAlertThreshold,
      partial.theme ?? current.theme,
    ],
  );
}

function mapCategory(r: {
  id: string;
  name: string;
  icon: string;
  tint: TintName;
  cap_cents: number;
  sort_order: number;
  active_month?: string | null;
}): Category {
  return {
    id: r.id,
    name: r.name,
    icon: r.icon,
    tint: r.tint,
    capCents: r.cap_cents,
    sortOrder: r.sort_order,
    activeMonth: r.active_month ?? null,
  };
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
    active_month: string | null;
  }>('SELECT * FROM categories ORDER BY sort_order ASC, name ASC');
  return rows.map(mapCategory);
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
    active_month: string | null;
  }>('SELECT * FROM categories WHERE id = ?', [id]);
  if (!r) return null;
  return mapCategory(r);
}

export async function upsertCategory(input: {
  id?: string;
  name: string;
  icon: string;
  tint: TintName;
  capCents: number;
  sortOrder?: number;
  activeMonth?: string | null;
}) {
  const db = await getDb();
  const id = input.id ?? newId('cat');
  await db.runAsync(
    `INSERT INTO categories (id, name, icon, tint, cap_cents, sort_order, active_month)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       name = excluded.name,
       icon = excluded.icon,
       tint = excluded.tint,
       cap_cents = excluded.cap_cents,
       sort_order = excluded.sort_order,
       active_month = excluded.active_month`,
    [
      id,
      input.name,
      input.icon,
      input.tint,
      input.capCents,
      input.sortOrder ?? 0,
      input.activeMonth ?? null,
    ],
  );
  return id;
}

/** Deletes a category; past expenses keep their amounts with category_id set to NULL. */
export async function deleteCategory(id: string) {
  const db = await getDb();
  await db.runAsync('UPDATE transactions SET category_id = NULL WHERE category_id = ?', [id]);
  await db.runAsync('UPDATE bills SET category_id = NULL WHERE category_id = ?', [id]);
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
      activeMonth: null,
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
    active_month: string | null;
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
    ...mapCategory(r),
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

async function monthlyTotalsByType(
  type: 'expense' | 'income',
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
     WHERE type = ? AND date >= ? AND date <= ?
     GROUP BY substr(date, 1, 7)`,
    [type, start, end],
  );
  const byMonth = new Map(rows.map((r) => [r.month, r.total]));
  return keys.map((month) => ({ month, totalCents: byMonth.get(month) ?? 0 }));
}

/** Last `months` calendar months (oldest → newest), including zeros. */
export async function monthlyExpenseTotals(
  months = 6,
): Promise<{ month: string; totalCents: number }[]> {
  return monthlyTotalsByType('expense', months);
}

/** Last `months` calendar months of income (oldest → newest), including zeros. */
export async function monthlyIncomeTotals(
  months = 6,
): Promise<{ month: string; totalCents: number }[]> {
  return monthlyTotalsByType('income', months);
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

function mapBill(r: {
  id: string;
  name: string;
  amount_cents: number;
  due_day: number;
  reminder_days_before: number;
  reminder_hour: number;
  category_id: string | null;
  notes: string;
  reminders_enabled: number;
}): Bill {
  return {
    id: r.id,
    name: r.name,
    amountCents: r.amount_cents,
    dueDay: r.due_day,
    reminderDaysBefore: r.reminder_days_before,
    reminderHour: r.reminder_hour,
    categoryId: r.category_id,
    notes: r.notes ?? '',
    remindersEnabled: r.reminders_enabled ? 1 : 0,
  };
}

export async function listBills(): Promise<Bill[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{
    id: string;
    name: string;
    amount_cents: number;
    due_day: number;
    reminder_days_before: number;
    reminder_hour: number;
    category_id: string | null;
    notes: string;
    reminders_enabled: number;
  }>('SELECT * FROM bills ORDER BY due_day ASC, name ASC');
  return rows.map(mapBill);
}

export async function listBillPayments(): Promise<BillPayment[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{
    id: string;
    bill_id: string;
    month: string;
    amount_cents: number;
    paid_at: string;
    transaction_id: string | null;
  }>('SELECT * FROM bill_payments');
  return rows.map((r) => ({
    id: r.id,
    billId: r.bill_id,
    month: r.month,
    amountCents: r.amount_cents,
    paidAt: r.paid_at,
    transactionId: r.transaction_id,
  }));
}

export async function listBillsWithStatus(month = monthKey()): Promise<BillWithStatus[]> {
  const bills = await listBills();
  const db = await getDb();
  const rows = await db.getAllAsync<{ bill_id: string; amount_cents: number }>(
    'SELECT bill_id, amount_cents FROM bill_payments WHERE month = ?',
    [month],
  );
  const paid = new Map(rows.map((r) => [r.bill_id, r.amount_cents]));
  return bills
    .map((bill) => withBillStatus(bill, paid.get(bill.id) ?? 0))
    .sort((a, b) => {
      if (a.paidThisMonth !== b.paidThisMonth) return a.paidThisMonth ? 1 : -1;
      return a.daysUntilDue - b.daysUntilDue;
    });
}

export async function addBill(input: {
  name: string;
  amountCents: number;
  dueDay: number;
  reminderDaysBefore?: number;
  reminderHour?: number;
  categoryId?: string | null;
  notes?: string;
  remindersEnabled?: number;
}) {
  const db = await getDb();
  const id = newId('bill');
  await db.runAsync(
    `INSERT INTO bills (
      id, name, amount_cents, due_day, reminder_days_before, reminder_hour,
      category_id, notes, reminders_enabled
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.name,
      input.amountCents,
      Math.min(31, Math.max(1, input.dueDay)),
      input.reminderDaysBefore ?? 1,
      input.reminderHour ?? 9,
      input.categoryId ?? null,
      input.notes ?? '',
      input.remindersEnabled ?? 1,
    ],
  );
  return id;
}

export async function updateBill(input: {
  id: string;
  name: string;
  amountCents: number;
  dueDay: number;
  reminderDaysBefore: number;
  reminderHour: number;
  categoryId?: string | null;
  notes?: string;
  remindersEnabled: number;
}) {
  const db = await getDb();
  await db.runAsync(
    `UPDATE bills SET
      name = ?,
      amount_cents = ?,
      due_day = ?,
      reminder_days_before = ?,
      reminder_hour = ?,
      category_id = ?,
      notes = ?,
      reminders_enabled = ?
     WHERE id = ?`,
    [
      input.name,
      input.amountCents,
      Math.min(31, Math.max(1, input.dueDay)),
      input.reminderDaysBefore,
      input.reminderHour,
      input.categoryId ?? null,
      input.notes ?? '',
      input.remindersEnabled,
      input.id,
    ],
  );
}

export async function deleteBill(id: string) {
  const db = await getDb();
  await db.runAsync('DELETE FROM bill_payments WHERE bill_id = ?', [id]);
  await db.runAsync('DELETE FROM bills WHERE id = ?', [id]);
}

export async function logBillPayment(input: {
  billId: string;
  month?: string;
  amountCents?: number;
}) {
  const bills = await listBills();
  const bill = bills.find((b) => b.id === input.billId);
  if (!bill) throw new Error('Bill not found');
  const month = input.month ?? monthKey();
  const amount = input.amountCents ?? bill.amountCents;
  if (amount <= 0) throw new Error('Amount must be greater than zero');

  const db = await getDb();
  const existing = await db.getFirstAsync<{ id: string; transaction_id: string | null }>(
    'SELECT id, transaction_id FROM bill_payments WHERE bill_id = ? AND month = ?',
    [bill.id, month],
  );
  if (existing) {
    await db.runAsync('UPDATE bill_payments SET amount_cents = ?, paid_at = ? WHERE id = ?', [
      amount,
      todayISO(),
      existing.id,
    ]);
    return existing.id;
  }

  let transactionId: string | null = null;
  if (bill.categoryId) {
    transactionId = await addTransaction({
      categoryId: bill.categoryId,
      amountCents: amount,
      note: bill.notes ? `${bill.name} · ${bill.notes}` : bill.name,
      date: todayISO(),
      type: 'expense',
    });
  }

  const id = newId('bpay');
  await db.runAsync(
    `INSERT INTO bill_payments (id, bill_id, month, amount_cents, paid_at, transaction_id)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, bill.id, month, amount, todayISO(), transactionId],
  );
  return id;
}

export async function undoBillPayment(billId: string, month = monthKey()) {
  const db = await getDb();
  const existing = await db.getFirstAsync<{ id: string; transaction_id: string | null }>(
    'SELECT id, transaction_id FROM bill_payments WHERE bill_id = ? AND month = ?',
    [billId, month],
  );
  if (!existing) return;
  if (existing.transaction_id) {
    await db.runAsync('DELETE FROM transactions WHERE id = ?', [existing.transaction_id]);
  }
  await db.runAsync('DELETE FROM bill_payments WHERE id = ?', [existing.id]);
}

/**
 * Opt-in sample data for demos. Never called automatically after onboarding.
 * Keeps existing categories. With `force`, clears goals/debts/transactions first.
 */
export async function loadSampleData(opts?: { force?: boolean }) {
  const force = opts?.force ?? false;
  const db = await getDb();

  if (force) {
    await db.execAsync(
      'DELETE FROM bill_payments; DELETE FROM bills; DELETE FROM transactions; DELETE FROM goals; DELETE FROM debts;',
    );
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

  if ((await listBills()).length === 0) {
    const byName = Object.fromEntries((await listCategories()).map((c) => [c.name, c.id]));
    const utilitiesId = byName['Utilities & bills'] ?? null;
    await addBill({
      name: 'Internet',
      amountCents: 215000,
      dueDay: 5,
      reminderDaysBefore: 1,
      reminderHour: 9,
      categoryId: utilitiesId,
      notes: 'Monthly fiber',
    });
    await addBill({
      name: 'Phone',
      amountCents: 120000,
      dueDay: 12,
      reminderDaysBefore: 2,
      reminderHour: 9,
      categoryId: utilitiesId,
    });
    await addBill({
      name: 'Rent',
      amountCents: 2500000,
      dueDay: 1,
      reminderDaysBefore: 3,
      reminderHour: 9,
      categoryId: utilitiesId,
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
  categories?: { name: string; icon: string; tint: TintName; capCents: number; activeMonth?: string | null }[];
  displayName?: string;
}) {
  const db = await getDb();
  await db.execAsync(
    'DELETE FROM bill_payments; DELETE FROM bills; DELETE FROM transactions; DELETE FROM categories; DELETE FROM goals; DELETE FROM debts;',
  );
  const template = BUDGET_TEMPLATES.find((t) => t.id === opts.templateId) ?? BUDGET_TEMPLATES[0];
  const source = opts.categories?.length
    ? opts.categories
    : template.categories.map((c) => ({
        name: c.name,
        icon: c.icon,
        tint: c.tint,
        capCents: c.capCents,
        activeMonth: null as string | null,
      }));
  for (let i = 0; i < source.length; i++) {
    const c = source[i];
    await upsertCategory({
      name: c.name,
      icon: c.icon,
      tint: c.tint,
      capCents: c.capCents,
      sortOrder: i,
      activeMonth: c.activeMonth ?? null,
    });
  }
  // No sample seed — user starts clean. Use Settings → Load sample data.
  await updateSettings({
    aiConsent: opts.aiConsent ? 1 : 0,
    onboardingComplete: 1,
    displayName: opts.displayName ?? 'Alex',
  });
}

/** Wipe all budget data and return to a fresh onboarding state. */
export async function resetAllData(): Promise<void> {
  const db = await getDb();
  await db.execAsync(`
    DELETE FROM bill_payments;
    DELETE FROM bills;
    DELETE FROM transactions;
    DELETE FROM categories;
    DELETE FROM goals;
    DELETE FROM debts;
    UPDATE settings SET
      display_name = 'Alex',
      currency = 'RD$',
      ai_consent = 0,
      onboarding_complete = 0,
      cap_alert_threshold = 80,
      theme = 'dark'
    WHERE id = 1;
  `);
}
