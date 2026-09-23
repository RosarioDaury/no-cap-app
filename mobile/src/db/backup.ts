import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { getDb } from '@/src/db/database';
import {
  getSettings,
  listBillPayments,
  listBills,
  listCategories,
  listDebts,
  listGoals,
  listTransactions,
  updateSettings,
} from '@/src/db/repositories';
import {
  AppSettings,
  Bill,
  BillPayment,
  Category,
  Debt,
  Goal,
  TintName,
  Transaction,
} from '@/src/db/types';

export const BACKUP_VERSION = 2 as const;

export type BackupPayload = {
  version: 1 | typeof BACKUP_VERSION;
  exportedAt: string;
  settings: AppSettings;
  categories: Category[];
  transactions: Transaction[];
  goals: Goal[];
  debts: Debt[];
  bills?: Bill[];
  billPayments?: BillPayment[];
};

export async function buildBackupPayload(): Promise<BackupPayload> {
  const [settings, categories, transactions, goals, debts, bills, billPayments] = await Promise.all([
    getSettings(),
    listCategories(),
    listTransactions({ limit: 10000 }),
    listGoals(),
    listDebts(),
    listBills(),
    listBillPayments(),
  ]);
  return {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    settings,
    categories,
    transactions,
    goals,
    debts,
    bills,
    billPayments,
  };
}

export async function exportBackupToShareSheet(): Promise<void> {
  const payload = await buildBackupPayload();
  const stamp = new Date().toISOString().slice(0, 10);
  const file = new File(Paths.cache, `nocap-backup-${stamp}.json`);
  file.create({ intermediates: true, overwrite: true });
  file.write(JSON.stringify(payload, null, 2));

  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) {
    throw new Error('Sharing is not available on this device');
  }
  await Sharing.shareAsync(file.uri, {
    mimeType: 'application/json',
    dialogTitle: 'Export NoCap backup',
    UTI: 'public.json',
  });
}

function isTint(v: unknown): v is TintName {
  return v === 'teal' || v === 'gold' || v === 'plum' || v === 'coral';
}

export function parseBackupJson(raw: string): BackupPayload {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error('File is not valid JSON');
  }
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid backup format');
  }
  const obj = data as Record<string, unknown>;
  if (obj.version !== 1 && obj.version !== 2) {
    throw new Error(`Unsupported backup version (${String(obj.version)})`);
  }
  if (!obj.settings || !Array.isArray(obj.categories) || !Array.isArray(obj.transactions)) {
    throw new Error('Backup is missing required sections');
  }
  return obj as unknown as BackupPayload;
}

export async function importBackupReplace(payload: BackupPayload): Promise<void> {
  const db = await getDb();
  await db.execAsync(
    'DELETE FROM bill_payments; DELETE FROM bills; DELETE FROM transactions; DELETE FROM categories; DELETE FROM goals; DELETE FROM debts;',
  );

  for (const c of payload.categories) {
    if (!c?.id || !c.name || !isTint(c.tint)) continue;
    await db.runAsync(
      `INSERT INTO categories (id, name, icon, tint, cap_cents, sort_order, active_month)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [c.id, c.name, c.icon || 'heart', c.tint, c.capCents ?? 0, c.sortOrder ?? 0, c.activeMonth ?? null],
    );
  }

  for (const t of payload.transactions ?? []) {
    if (!t?.id || !t.type) continue;
    await db.runAsync(
      `INSERT INTO transactions (id, category_id, amount_cents, note, date, type)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        t.id,
        t.categoryId ?? null,
        t.amountCents ?? 0,
        t.note ?? '',
        t.date,
        t.type === 'income' ? 'income' : 'expense',
      ],
    );
  }

  for (const g of payload.goals ?? []) {
    if (!g?.id || !g.name) continue;
    await db.runAsync(
      `INSERT INTO goals (id, name, icon, target_cents, saved_cents, due_date)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        g.id,
        g.name,
        g.icon || 'umbrella',
        g.targetCents ?? 0,
        g.savedCents ?? 0,
        g.dueDate ?? null,
      ],
    );
  }

  for (const d of payload.debts ?? []) {
    if (!d?.id || !d.name) continue;
    const balance = d.balanceCents ?? 0;
    const original = d.originalBalanceCents || balance;
    await db.runAsync(
      `INSERT INTO debts (id, name, balance_cents, original_balance_cents, payment_cents, due_date)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [d.id, d.name, balance, original, d.paymentCents ?? 0, d.dueDate ?? null],
    );
  }

  for (const b of payload.bills ?? []) {
    if (!b?.id || !b.name) continue;
    await db.runAsync(
      `INSERT INTO bills (
        id, name, amount_cents, due_day, reminder_days_before, reminder_hour,
        category_id, notes, reminders_enabled
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        b.id,
        b.name,
        b.amountCents ?? 0,
        Math.min(31, Math.max(1, b.dueDay ?? 1)),
        b.reminderDaysBefore ?? 1,
        b.reminderHour ?? 9,
        b.categoryId ?? null,
        b.notes ?? '',
        b.remindersEnabled ?? 1,
      ],
    );
  }

  for (const p of payload.billPayments ?? []) {
    if (!p?.id || !p.billId || !p.month) continue;
    await db.runAsync(
      `INSERT INTO bill_payments (id, bill_id, month, amount_cents, paid_at, transaction_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [p.id, p.billId, p.month, p.amountCents ?? 0, p.paidAt, p.transactionId ?? null],
    );
  }

  const s = payload.settings;
  await updateSettings({
    displayName: s.displayName ?? 'Alex',
    currency: s.currency ?? 'RD$',
    aiConsent: s.aiConsent ?? 0,
    onboardingComplete: 1,
    capAlertThreshold: s.capAlertThreshold ?? 80,
    theme: s.theme === 'light' ? 'light' : 'dark',
  });
}

export async function pickAndImportBackup(): Promise<'canceled' | 'imported'> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/json', 'public.json', 'text/json'],
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (result.canceled || !result.assets?.[0]) {
    return 'canceled';
  }
  const asset = result.assets[0];
  const file = new File(asset.uri);
  const raw = await file.text();
  const payload = parseBackupJson(raw);
  await importBackupReplace(payload);
  return 'imported';
}
