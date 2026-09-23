import { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  Switch,
} from 'react-native';
import { Plus, Bell } from 'lucide-react-native';
import {
  DisplayTitle,
  BodySm,
  Card,
  IconButton,
  EmptyState,
  ButtonPrimary,
  ButtonSecondary,
  RowIcon,
  KeyboardSheet,
  Chip,
} from '@/src/components';
import { CategoryIcon, useIconBg } from '@/src/components/CategoryIcon';
import { useDb } from '@/src/hooks/DbProvider';
import { useTheme } from '@/src/hooks/ThemeProvider';
import { BillWithStatus } from '@/src/db/types';
import { formatMoney, parseMoneyInput } from '@/src/lib/format';
import { billStatusLabel, ordinalDay } from '@/src/lib/bills';
import {
  notificationsSupported,
  requestReminderPermission,
} from '@/src/lib/billNotifications';
import { ThemeColors, typography } from '@/src/theme/theme';

type BillDraft = {
  id?: string;
  name: string;
  amountText: string;
  dueDay: number;
  reminderDaysBefore: number;
  reminderHour: number;
  categoryId: string | null;
  notes: string;
  remindersEnabled: boolean;
};

type PayDraft = {
  bill: BillWithStatus;
  amountText: string;
};

const DUE_DAYS = [1, 5, 10, 15, 20, 28];
const REMIND_OPTIONS = [
  { label: 'On due day', value: 0 },
  { label: '1 day before', value: 1 },
  { label: '2 days', value: 2 },
  { label: '3 days', value: 3 },
  { label: '1 week', value: 7 },
];
const HOUR_OPTIONS = [
  { label: '8 AM', value: 8 },
  { label: '9 AM', value: 9 },
  { label: 'Noon', value: 12 },
  { label: '6 PM', value: 18 },
];

const emptyDraft = (): BillDraft => ({
  name: '',
  amountText: '',
  dueDay: 1,
  reminderDaysBefore: 1,
  reminderHour: 9,
  categoryId: null,
  notes: '',
  remindersEnabled: true,
});

export function BillsPane() {
  const { bills, categories, settings, saveBill, removeBill, payBill, unpayBill } = useDb();
  const { colors } = useTheme();
  const iconBg = useIconBg();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const currency = settings?.currency ?? 'RD$';

  const [modalOpen, setModalOpen] = useState(false);
  const [draft, setDraft] = useState<BillDraft>(emptyDraft());
  const [saving, setSaving] = useState(false);
  const [pay, setPay] = useState<PayDraft | null>(null);
  const [paying, setPaying] = useState(false);

  const unpaid = bills.filter((b) => !b.paidThisMonth);
  const dueSoon = unpaid.filter((b) => b.daysUntilDue <= 3);
  const monthTotal = bills.reduce((s, b) => s + b.amountCents, 0);
  const paidTotal = bills.reduce((s, b) => s + (b.paidThisMonth ? b.paidAmountCents : 0), 0);

  const modalTitle = draft.id ? 'Edit bill' : 'Add bill';

  const openCreate = () => {
    setDraft({
      ...emptyDraft(),
      categoryId: categories.find((c) => c.name.toLowerCase().includes('bill'))?.id ?? null,
    });
    setModalOpen(true);
  };

  const openEdit = (b: BillWithStatus) => {
    setDraft({
      id: b.id,
      name: b.name,
      amountText: String(b.amountCents / 100),
      dueDay: b.dueDay,
      reminderDaysBefore: b.reminderDaysBefore,
      reminderHour: b.reminderHour,
      categoryId: b.categoryId,
      notes: b.notes,
      remindersEnabled: !!b.remindersEnabled,
    });
    setModalOpen(true);
  };

  const onSave = async () => {
    const name = draft.name.trim();
    if (!name) {
      Alert.alert('Name required', 'Give this bill a name.');
      return;
    }
    const amountCents = parseMoneyInput(draft.amountText);
    if (amountCents <= 0) {
      Alert.alert('Amount', 'Enter what you usually pay.');
      return;
    }
    if (draft.remindersEnabled && notificationsSupported()) {
      const granted = await requestReminderPermission();
      if (!granted) {
        Alert.alert(
          'Reminders off',
          'NoCap could not schedule notifications. You can still track the bill and enable reminders later in Settings.',
        );
      }
    }
    setSaving(true);
    try {
      await saveBill({
        id: draft.id,
        name,
        amountCents,
        dueDay: draft.dueDay,
        reminderDaysBefore: draft.reminderDaysBefore,
        reminderHour: draft.reminderHour,
        categoryId: draft.categoryId,
        notes: draft.notes.trim(),
        remindersEnabled: draft.remindersEnabled ? 1 : 0,
      });
      setModalOpen(false);
      setDraft(emptyDraft());
    } catch {
      Alert.alert('Could not save', 'Try again.');
    } finally {
      setSaving(false);
    }
  };

  const onDelete = (b: BillWithStatus) => {
    Alert.alert('Delete bill?', `"${b.name}" and its reminder will be removed.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          removeBill(b.id).catch(() => Alert.alert('Delete failed', 'Try again.'));
        },
      },
    ]);
  };

  const onPay = async () => {
    if (!pay) return;
    const amount = parseMoneyInput(pay.amountText);
    if (amount <= 0) {
      Alert.alert('Enter an amount', 'Payment must be greater than zero.');
      return;
    }
    setPaying(true);
    try {
      await payBill(pay.bill.id, amount);
      setPay(null);
    } catch {
      Alert.alert('Could not log payment', 'Try again.');
    } finally {
      setPaying(false);
    }
  };

  return (
    <>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.paneHeader}>
          <Text style={styles.paneTitle}>Recurring bills</Text>
          <IconButton onPress={openCreate} accessibilityLabel="Add bill">
            <Plus size={16} color={colors.textSecondary} />
          </IconButton>
        </View>

        {bills.length === 0 ? (
          <EmptyState
            title="No recurring bills"
            message="Add rent, internet, or anything you pay each month. NoCap will remind you before it’s due."
          />
        ) : (
          <View style={{ gap: 11 }}>
            <Card>
              <Text style={styles.eyebrow}>This month</Text>
              <Text style={styles.total}>{formatMoney(paidTotal, currency)}</Text>
              <BodySm style={{ color: colors.teal[700], marginTop: 2 }}>
                {unpaid.length === 0
                  ? 'All bills marked paid'
                  : `${dueSoon.length} due soon · ${formatMoney(monthTotal - paidTotal, currency)} still open`}
              </BodySm>
            </Card>

            {bills.map((b) => {
              const overdue = !b.paidThisMonth && b.daysUntilDue < 0;
              const tint = b.paidThisMonth ? 'teal' : overdue ? 'coral' : 'gold';
              return (
                <Card key={b.id} variant="tint" tint={tint}>
                  <Pressable onPress={() => openEdit(b)}>
                    <View style={styles.billHeader}>
                      <RowIcon backgroundColor={iconBg(tint)}>
                        <CategoryIcon name="zap" tint={tint} />
                      </RowIcon>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.name}>{b.name}</Text>
                        <Text style={styles.rowSub}>{billStatusLabel(b)}</Text>
                      </View>
                      <Text style={styles.amount}>{formatMoney(b.amountCents, currency)}</Text>
                    </View>
                    <View style={styles.metaRow}>
                      <View>
                        <Text style={styles.eyebrow}>Due</Text>
                        <Text style={styles.metaValue}>The {ordinalDay(b.dueDay)}</Text>
                      </View>
                      <View>
                        <Text style={styles.eyebrow}>Reminder</Text>
                        <Text style={styles.metaValue}>
                          {b.remindersEnabled
                            ? b.reminderDaysBefore === 0
                              ? 'On due day'
                              : `${b.reminderDaysBefore}d before`
                            : 'Off'}
                        </Text>
                      </View>
                      <View>
                        <Text style={styles.eyebrow}>Status</Text>
                        <Text style={styles.metaValue}>{b.paidThisMonth ? 'Paid' : 'Open'}</Text>
                      </View>
                    </View>
                  </Pressable>
                  <View style={styles.cardActions}>
                    {b.paidThisMonth ? (
                      <Pressable
                        onPress={() =>
                          unpayBill(b.id).catch(() => Alert.alert('Could not undo', 'Try again.'))
                        }
                        style={styles.linkBtn}
                      >
                        <Text style={styles.linkText}>Unmark paid</Text>
                      </Pressable>
                    ) : (
                      <Pressable
                        onPress={() =>
                          setPay({
                            bill: b,
                            amountText: String(b.amountCents / 100),
                          })
                        }
                        style={styles.linkBtn}
                      >
                        <Text style={styles.linkText}>Log this month</Text>
                      </Pressable>
                    )}
                    <Pressable onPress={() => onDelete(b)} style={styles.linkBtn}>
                      <Text style={[styles.linkText, { color: colors.coral[500] }]}>Delete</Text>
                    </Pressable>
                  </View>
                </Card>
              );
            })}
          </View>
        )}
      </ScrollView>

      <KeyboardSheet
        visible={modalOpen}
        onRequestClose={() => {
          setModalOpen(false);
          setDraft(emptyDraft());
        }}
        scroll
      >
        <DisplayTitle style={{ fontSize: 18, marginBottom: 12 }}>{modalTitle}</DisplayTitle>

        <Text style={styles.label}>Name</Text>
        <TextInput
          value={draft.name}
          onChangeText={(name) => setDraft((d) => ({ ...d, name }))}
          placeholder="Internet, rent, phone…"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
        />

        <Text style={styles.label}>Usual amount</Text>
        <TextInput
          value={draft.amountText}
          onChangeText={(amountText) => setDraft((d) => ({ ...d, amountText }))}
          placeholder={`${currency}0`}
          placeholderTextColor={colors.textMuted}
          keyboardType="decimal-pad"
          style={styles.input}
        />

        <Text style={styles.label}>Due day each month</Text>
        <View style={styles.chips}>
          {DUE_DAYS.map((day) => (
            <Chip
              key={day}
              label={ordinalDay(day)}
              selected={draft.dueDay === day}
              onPress={() => setDraft((d) => ({ ...d, dueDay: day }))}
            />
          ))}
        </View>
        <TextInput
          value={String(draft.dueDay)}
          onChangeText={(raw) => {
            const n = Number.parseInt(raw.replace(/[^\d]/g, ''), 10);
            if (!raw) return;
            if (Number.isNaN(n)) return;
            setDraft((d) => ({ ...d, dueDay: Math.min(31, Math.max(1, n)) }));
          }}
          keyboardType="number-pad"
          style={styles.input}
          accessibilityLabel="Due day of month"
        />

        <Text style={styles.label}>Remind me</Text>
        <View style={styles.chips}>
          {REMIND_OPTIONS.map((opt) => (
            <Chip
              key={opt.value}
              label={opt.label}
              selected={draft.reminderDaysBefore === opt.value}
              onPress={() => setDraft((d) => ({ ...d, reminderDaysBefore: opt.value }))}
            />
          ))}
        </View>

        <Text style={styles.label}>Reminder time</Text>
        <View style={styles.chips}>
          {HOUR_OPTIONS.map((opt) => (
            <Chip
              key={opt.value}
              label={opt.label}
              selected={draft.reminderHour === opt.value}
              onPress={() => setDraft((d) => ({ ...d, reminderHour: opt.value }))}
            />
          ))}
        </View>

        <Text style={styles.label}>Log spend to</Text>
        <View style={styles.chips}>
          <Chip
            label="Don’t log"
            selected={draft.categoryId === null}
            onPress={() => setDraft((d) => ({ ...d, categoryId: null }))}
          />
          {categories.map((c) => (
            <Chip
              key={c.id}
              label={c.name}
              selected={draft.categoryId === c.id}
              onPress={() => setDraft((d) => ({ ...d, categoryId: c.id }))}
            />
          ))}
        </View>

        <Text style={styles.label}>Note</Text>
        <TextInput
          value={draft.notes}
          onChangeText={(notes) => setDraft((d) => ({ ...d, notes }))}
          placeholder="Optional"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
        />

        <View style={styles.switchRow}>
          <Bell size={16} color={colors.textSecondary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.switchTitle}>Notify me</Text>
            <BodySm>Local reminder on this device. No account needed.</BodySm>
          </View>
          <Switch
            value={draft.remindersEnabled}
            onValueChange={(remindersEnabled) => setDraft((d) => ({ ...d, remindersEnabled }))}
            trackColor={{ false: colors.surfaceAlt, true: colors.teal[700] }}
            thumbColor={draft.remindersEnabled ? colors.teal[300] : colors.textMuted}
          />
        </View>

        <View style={styles.actions}>
          <ButtonSecondary
            label="Cancel"
            style={{ flex: 1 }}
            onPress={() => {
              setModalOpen(false);
              setDraft(emptyDraft());
            }}
          />
          <ButtonPrimary label="Save" loading={saving} style={{ flex: 1 }} onPress={onSave} />
        </View>
      </KeyboardSheet>

      <KeyboardSheet visible={!!pay} onRequestClose={() => setPay(null)}>
        <DisplayTitle style={{ fontSize: 18, marginBottom: 8 }}>Log this month</DisplayTitle>
        <BodySm style={{ marginBottom: 12 }}>
          {pay?.bill.name ?? 'Bill'} · due the {pay ? ordinalDay(pay.bill.dueDay) : ''}
          {pay?.bill.categoryId
            ? ' · also logs an expense in that category'
            : ' · tracking only, no expense logged'}
        </BodySm>
        <TextInput
          value={pay?.amountText ?? ''}
          onChangeText={(amountText) => setPay((p) => (p ? { ...p, amountText } : p))}
          placeholder={`${currency}0`}
          placeholderTextColor={colors.textMuted}
          keyboardType="decimal-pad"
          style={styles.input}
          autoFocus
        />
        <View style={styles.actions}>
          <ButtonSecondary label="Cancel" style={{ flex: 1 }} onPress={() => setPay(null)} />
          <ButtonPrimary label="Mark paid" loading={paying} style={{ flex: 1 }} onPress={onPay} />
        </View>
      </KeyboardSheet>
    </>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    content: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 32 },
    paneHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    paneTitle: {
      fontFamily: typography.uiSemiBold,
      fontSize: 13,
      color: colors.textSecondary,
    },
    eyebrow: {
      fontFamily: typography.uiBold,
      fontSize: 10,
      letterSpacing: 1,
      textTransform: 'uppercase',
      color: colors.textMuted,
      marginBottom: 2,
    },
    total: {
      fontFamily: typography.display,
      fontSize: 28,
      color: colors.textPrimary,
    },
    billHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: 9,
    },
    name: {
      fontFamily: typography.uiSemiBold,
      fontSize: 13,
      color: colors.textPrimary,
    },
    rowSub: {
      fontFamily: typography.ui,
      fontSize: 11,
      color: colors.textMuted,
      marginTop: 1,
    },
    amount: {
      fontFamily: typography.display,
      fontSize: 13,
      color: colors.textPrimary,
    },
    metaRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 4,
      gap: 8,
    },
    metaValue: {
      fontFamily: typography.display,
      fontSize: 13,
      color: colors.textPrimary,
    },
    cardActions: {
      flexDirection: 'row',
      gap: 16,
      marginTop: 12,
    },
    linkBtn: { paddingVertical: 2 },
    linkText: {
      fontFamily: typography.uiSemiBold,
      fontSize: 12,
      color: colors.gold[500],
    },
    chips: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 12,
    },
    label: {
      fontFamily: typography.uiBold,
      fontSize: 11,
      letterSpacing: 0.4,
      textTransform: 'uppercase',
      color: colors.textMuted,
      marginBottom: 6,
      marginTop: 4,
    },
    input: {
      height: 42,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceAlt,
      color: colors.textPrimary,
      paddingHorizontal: 12,
      fontFamily: typography.ui,
      fontSize: 13,
      marginBottom: 10,
    },
    switchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 11,
      marginBottom: 12,
      marginTop: 4,
    },
    switchTitle: {
      fontFamily: typography.uiSemiBold,
      fontSize: 13,
      color: colors.textPrimary,
    },
    actions: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 8,
    },
  });
}
