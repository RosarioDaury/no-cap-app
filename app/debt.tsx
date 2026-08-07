import { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Pressable,
  Modal,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Plus, Sparkles } from 'lucide-react-native';
import {
  Screen,
  DisplayTitle,
  BodySm,
  Card,
  ProgressBar,
  IconButton,
  EmptyState,
  ButtonPrimary,
  ButtonSecondary,
  RowIcon,
} from '@/src/components';
import { CategoryIcon, useIconBg } from '@/src/components/CategoryIcon';
import { useDb } from '@/src/hooks/DbProvider';
import { useTheme } from '@/src/hooks/ThemeProvider';
import { Debt } from '@/src/db/types';
import { formatMoney, formatShortDate, parseMoneyInput } from '@/src/lib/format';
import { ThemeColors, typography } from '@/src/theme/theme';

type DebtDraft = {
  id?: string;
  name: string;
  balanceText: string;
  paymentText: string;
  dueDate: string;
};

type PayDraft = {
  debt: Debt;
  amountText: string;
};

const emptyDraft = (): DebtDraft => ({
  name: '',
  balanceText: '',
  paymentText: '',
  dueDate: '',
});

function payoffMonths(balance: number, payment: number) {
  if (payment <= 0 || balance <= 0) return 0;
  return Math.ceil(balance / payment);
}

function paidProgress(d: Debt) {
  const original = Math.max(d.originalBalanceCents, d.balanceCents, 1);
  const paid = Math.max(0, original - d.balanceCents);
  return Math.min(1, paid / original);
}

export default function DebtScreen() {
  const router = useRouter();
  const { debts, settings, saveDebt, removeDebt, payDebt } = useDb();
  const { colors } = useTheme();
  const iconBg = useIconBg();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const currency = settings?.currency ?? 'RD$';

  const [modalOpen, setModalOpen] = useState(false);
  const [draft, setDraft] = useState<DebtDraft>(emptyDraft());
  const [saving, setSaving] = useState(false);
  const [pay, setPay] = useState<PayDraft | null>(null);
  const [paying, setPaying] = useState(false);

  const totalRemaining = debts.reduce((s, d) => s + d.balanceCents, 0);
  const totalOriginal = debts.reduce(
    (s, d) => s + Math.max(d.originalBalanceCents, d.balanceCents),
    0,
  );
  const totalPaidPct =
    totalOriginal > 0
      ? Math.round(((totalOriginal - totalRemaining) / totalOriginal) * 100)
      : 0;

  const modalTitle = useMemo(() => (draft.id ? 'Edit debt' : 'Add debt'), [draft.id]);

  const openCreate = () => {
    setDraft(emptyDraft());
    setModalOpen(true);
  };

  const openEdit = (d: Debt) => {
    setDraft({
      id: d.id,
      name: d.name,
      balanceText: String(d.balanceCents / 100),
      paymentText: String(d.paymentCents / 100),
      dueDate: d.dueDate ?? '',
    });
    setModalOpen(true);
  };

  const onSave = async () => {
    const name = draft.name.trim();
    if (!name) {
      Alert.alert('Name required', 'Give this debt a name.');
      return;
    }
    const balanceCents = parseMoneyInput(draft.balanceText);
    if (balanceCents < 0) {
      Alert.alert('Balance', 'Enter a valid balance.');
      return;
    }
    const due = draft.dueDate.trim();
    if (due && !/^\d{4}-\d{2}-\d{2}$/.test(due)) {
      Alert.alert('Due date', 'Use YYYY-MM-DD or leave blank.');
      return;
    }
    setSaving(true);
    try {
      const existing = debts.find((d) => d.id === draft.id);
      await saveDebt({
        id: draft.id,
        name,
        balanceCents,
        originalBalanceCents: draft.id
          ? Math.max(existing?.originalBalanceCents ?? balanceCents, balanceCents)
          : balanceCents,
        paymentCents: parseMoneyInput(draft.paymentText),
        dueDate: due || null,
      });
      setModalOpen(false);
      setDraft(emptyDraft());
    } catch {
      Alert.alert('Could not save', 'Try again.');
    } finally {
      setSaving(false);
    }
  };

  const onDelete = (d: Debt) => {
    Alert.alert('Delete debt?', `"${d.name}" will be removed.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          removeDebt(d.id).catch(() => Alert.alert('Delete failed', 'Try again.'));
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
      await payDebt(pay.debt.id, amount);
      setPay(null);
    } catch {
      Alert.alert('Could not log payment', 'Try again.');
    } finally {
      setPaying(false);
    }
  };

  const tipDebt = debts.find((d) => d.balanceCents > 0 && d.paymentCents > 0);
  const tipBoostMonths =
    tipDebt && tipDebt.paymentCents > 0
      ? payoffMonths(tipDebt.balanceCents, tipDebt.paymentCents) -
        payoffMonths(tipDebt.balanceCents, tipDebt.paymentCents + 100000)
      : 0;

  return (
    <Screen edges={['top']} padded={false}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.topbar}>
          <IconButton onPress={() => router.back()}>
            <ArrowLeft size={16} color={colors.textSecondary} />
          </IconButton>
          <DisplayTitle style={{ fontSize: 17 }}>Debt tracker</DisplayTitle>
          <IconButton onPress={openCreate}>
            <Plus size={16} color={colors.textSecondary} />
          </IconButton>
        </View>

        {debts.length === 0 ? (
          <EmptyState
            title="No debts tracked"
            message="Tap + to add a balance and monthly payment."
          />
        ) : (
          <View style={{ gap: 11 }}>
            <Card>
              <Text style={styles.eyebrow}>Total debt remaining</Text>
              <Text style={styles.total}>{formatMoney(totalRemaining, currency)}</Text>
              <BodySm style={{ color: colors.teal[700], marginTop: 2 }}>
                {totalOriginal > totalRemaining
                  ? `Down from ${formatMoney(totalOriginal, currency)} · ${totalPaidPct}% paid off`
                  : 'Log payments to track payoff progress'}
              </BodySm>
            </Card>

            {debts.map((d) => {
              const months = payoffMonths(d.balanceCents, d.paymentCents);
              const progress = paidProgress(d);
              const payoffLabel =
                months > 0
                  ? (() => {
                      const end = new Date();
                      end.setMonth(end.getMonth() + months);
                      return end.toLocaleDateString('en-US', {
                        month: 'short',
                        year: 'numeric',
                      });
                    })()
                  : '—';
              return (
                <Card key={d.id} variant="tint" tint="plum">
                  <Pressable onPress={() => openEdit(d)}>
                    <View style={styles.debtHeader}>
                      <RowIcon backgroundColor={iconBg('plum')}>
                        <CategoryIcon name="credit-card" tint="plum" />
                      </RowIcon>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.name}>{d.name}</Text>
                        <Text style={styles.rowSub}>
                          {d.dueDate ? `Due ${formatShortDate(d.dueDate)}` : 'No due date'}
                        </Text>
                      </View>
                      <Text style={styles.pct}>{Math.round(progress * 100)}%</Text>
                    </View>
                    <ProgressBar progress={progress} tint="plum" />
                    <View style={styles.metaRow}>
                      <View>
                        <Text style={styles.eyebrow}>Paying</Text>
                        <Text style={styles.metaValue}>
                          {formatMoney(d.paymentCents, currency)}/mo
                        </Text>
                      </View>
                      <View>
                        <Text style={styles.eyebrow}>Payoff</Text>
                        <Text style={styles.metaValue}>{payoffLabel}</Text>
                      </View>
                      <View>
                        <Text style={styles.eyebrow}>Balance</Text>
                        <Text style={styles.metaValue}>
                          {formatMoney(d.balanceCents, currency)}
                        </Text>
                      </View>
                    </View>
                  </Pressable>
                  <View style={styles.cardActions}>
                    <Pressable
                      onPress={() =>
                        setPay({
                          debt: d,
                          amountText: d.paymentCents ? String(d.paymentCents / 100) : '',
                        })
                      }
                      style={styles.linkBtn}
                    >
                      <Text style={styles.linkText}>Log payment</Text>
                    </Pressable>
                    <Pressable onPress={() => onDelete(d)} style={styles.linkBtn}>
                      <Text style={[styles.linkText, { color: colors.coral[500] }]}>Delete</Text>
                    </Pressable>
                  </View>
                </Card>
              );
            })}

            {tipDebt && tipBoostMonths > 0 ? (
              <Card variant="flat" style={styles.tip}>
                <Sparkles size={15} color={colors.gold[700]} />
                <BodySm style={{ color: colors.gold[700], flex: 1 }}>
                  Adding {formatMoney(100000, currency)}/mo to {tipDebt.name} clears it about{' '}
                  {tipBoostMonths} month{tipBoostMonths === 1 ? '' : 's'} sooner.
                </BodySm>
              </Card>
            ) : null}
          </View>
        )}
      </ScrollView>

      <Modal visible={modalOpen} transparent animationType="slide">
        <View style={styles.backdrop}>
          <ScrollView contentContainerStyle={styles.sheetScroll} keyboardShouldPersistTaps="handled">
            <View style={styles.sheet}>
              <DisplayTitle style={{ fontSize: 18, marginBottom: 12 }}>{modalTitle}</DisplayTitle>

              <Text style={styles.label}>Name</Text>
              <TextInput
                value={draft.name}
                onChangeText={(name) => setDraft((d) => ({ ...d, name }))}
                placeholder="Credit card"
                placeholderTextColor={colors.textMuted}
                style={styles.input}
              />

              <Text style={styles.label}>Balance remaining</Text>
              <TextInput
                value={draft.balanceText}
                onChangeText={(balanceText) => setDraft((d) => ({ ...d, balanceText }))}
                placeholder={`${currency}0`}
                placeholderTextColor={colors.textMuted}
                keyboardType="decimal-pad"
                style={styles.input}
              />

              <Text style={styles.label}>Monthly payment</Text>
              <TextInput
                value={draft.paymentText}
                onChangeText={(paymentText) => setDraft((d) => ({ ...d, paymentText }))}
                placeholder={`${currency}0`}
                placeholderTextColor={colors.textMuted}
                keyboardType="decimal-pad"
                style={styles.input}
              />

              <Text style={styles.label}>Due date (YYYY-MM-DD)</Text>
              <TextInput
                value={draft.dueDate}
                onChangeText={(dueDate) => setDraft((d) => ({ ...d, dueDate }))}
                placeholder="Optional"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                style={styles.input}
              />

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
            </View>
          </ScrollView>
        </View>
      </Modal>

      <Modal visible={!!pay} transparent animationType="slide">
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <DisplayTitle style={{ fontSize: 18, marginBottom: 8 }}>Log payment</DisplayTitle>
            <BodySm style={{ marginBottom: 12 }}>
              Toward {pay?.debt.name ?? 'debt'} · balance{' '}
              {pay ? formatMoney(pay.debt.balanceCents, currency) : ''}
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
              <ButtonPrimary label="Apply" loading={paying} style={{ flex: 1 }} onPress={onPay} />
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 32 },
    topbar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
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
    debtHeader: {
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
    pct: {
      fontFamily: typography.display,
      fontSize: 13,
      color: colors.plum[500],
    },
    metaRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 12,
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
      color: colors.plum[500],
    },
    tip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 9,
    },
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.55)',
      justifyContent: 'flex-end',
    },
    sheetScroll: { flexGrow: 1, justifyContent: 'flex-end' },
    sheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 20,
      paddingBottom: 36,
      borderWidth: 1,
      borderColor: colors.border,
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
    actions: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 8,
    },
  });
}
