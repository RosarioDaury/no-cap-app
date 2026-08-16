import { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import {
  Screen,
  DisplayTitle,
  Card,
  ButtonPrimary,
  ButtonSecondary,
  IconButton,
  EmptyState,
  SectionTitle,
  KeyboardSheet,
  KeyboardFormScroll,
} from '@/src/components';
import { useDb } from '@/src/hooks/DbProvider';
import { useTheme } from '@/src/hooks/ThemeProvider';
import { Transaction } from '@/src/db/types';
import { formatMoney, formatShortDate, parseMoneyInput } from '@/src/lib/format';
import { ThemeColors, typography } from '@/src/theme/theme';

type TxnRow = Transaction & { categoryName?: string };

type EditDraft = {
  id: string;
  amountText: string;
  note: string;
  date: string;
};

export default function IncomeScreen() {
  const router = useRouter();
  const {
    incomeTransactions,
    categories,
    settings,
    logIncome,
    saveTransaction,
    removeTransaction,
  } = useDb();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const currency = settings?.currency ?? 'RD$';
  const [raw, setRaw] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [edit, setEdit] = useState<EditDraft | null>(null);
  const [saving, setSaving] = useState(false);

  const monthPrefix = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  const monthIncome = incomeTransactions.filter((t) => t.date.startsWith(monthPrefix));
  const totalIncome = monthIncome.reduce((s, t) => s + t.amountCents, 0);
  const totalSpent = categories.reduce((s, c) => s + c.spentCents, 0);
  const net = totalIncome - totalSpent;

  const openEdit = (t: TxnRow) => {
    setEdit({
      id: t.id,
      amountText: String(t.amountCents / 100),
      note: t.note,
      date: t.date,
    });
  };

  const onSaveEdit = async () => {
    if (!edit) return;
    const amountCents = parseMoneyInput(edit.amountText);
    if (amountCents <= 0) {
      Alert.alert('Enter an amount', 'Amount must be greater than zero.');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(edit.date.trim())) {
      Alert.alert('Date', 'Use YYYY-MM-DD.');
      return;
    }
    setSaving(true);
    try {
      await saveTransaction({
        id: edit.id,
        categoryId: null,
        amountCents,
        note: edit.note,
        date: edit.date.trim(),
        type: 'income',
      });
      setEdit(null);
    } catch {
      Alert.alert('Could not save', 'Try again.');
    } finally {
      setSaving(false);
    }
  };

  const onDelete = () => {
    if (!edit) return;
    Alert.alert('Delete income?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await removeTransaction(edit.id);
            setEdit(null);
          } catch {
            Alert.alert('Delete failed', 'Try again.');
          }
        },
      },
    ]);
  };

  return (
    <Screen edges={['top']} padded={false}>
      <KeyboardFormScroll contentContainerStyle={styles.content}>
        <View style={styles.topbar}>
          <IconButton onPress={() => router.back()}>
            <ArrowLeft size={16} color={colors.textSecondary} />
          </IconButton>
          <DisplayTitle style={{ fontSize: 17 }}>Income</DisplayTitle>
          <View style={{ width: 34 }} />
        </View>

        <Card variant="tint" tint="teal" style={{ marginBottom: 18 }}>
          <Text style={styles.label}>Total this month</Text>
          <Text style={styles.total}>{formatMoney(totalIncome, currency)}</Text>
          <View style={styles.metaRow}>
            <View>
              <Text style={styles.metaLabel}>Spent</Text>
              <Text style={styles.metaValue}>{formatMoney(totalSpent, currency)}</Text>
            </View>
            <View>
              <Text style={styles.metaLabel}>Net</Text>
              <Text style={[styles.metaValue, { color: net >= 0 ? colors.teal[300] : colors.coral[500] }]}>
                {formatMoney(net, currency)}
              </Text>
            </View>
          </View>
        </Card>

        <SectionTitle>Log income</SectionTitle>
        <TextInput
          value={raw}
          onChangeText={setRaw}
          placeholder={`${currency}0`}
          placeholderTextColor={colors.textMuted}
          keyboardType="decimal-pad"
          style={styles.input}
        />
        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="Paycheck, freelance…"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
        />
        <ButtonPrimary
          label="Add income"
          loading={loading}
          style={{ marginBottom: 20 }}
          onPress={async () => {
            const cents = parseMoneyInput(raw);
            if (cents <= 0) return;
            setLoading(true);
            try {
              await logIncome({ amountCents: cents, note });
              setRaw('');
              setNote('');
            } finally {
              setLoading(false);
            }
          }}
        />

        <SectionTitle>Sources</SectionTitle>
        {monthIncome.length === 0 ? (
          <EmptyState title="No income logged" message="Add a paycheck or other inflow above." />
        ) : (
          monthIncome.map((t, i) => (
            <Pressable
              key={t.id}
              onPress={() => openEdit(t)}
              style={[styles.row, i === monthIncome.length - 1 && { borderBottomWidth: 0 }]}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{t.note || 'Income'}</Text>
                <Text style={styles.rowSub}>{formatShortDate(t.date)} · tap to edit</Text>
              </View>
              <Text style={styles.value}>{formatMoney(t.amountCents, currency)}</Text>
            </Pressable>
          ))
        )}
      </KeyboardFormScroll>

      <KeyboardSheet visible={!!edit} onRequestClose={() => setEdit(null)} scroll>
        <DisplayTitle style={{ fontSize: 18, marginBottom: 12 }}>Edit income</DisplayTitle>
        <Text style={styles.fieldLabel}>Amount</Text>
        <TextInput
          value={edit?.amountText ?? ''}
          onChangeText={(amountText) => setEdit((e) => (e ? { ...e, amountText } : e))}
          placeholder={`${currency}0`}
          placeholderTextColor={colors.textMuted}
          keyboardType="decimal-pad"
          style={styles.input}
        />
        <Text style={styles.fieldLabel}>Note</Text>
        <TextInput
          value={edit?.note ?? ''}
          onChangeText={(n) => setEdit((e) => (e ? { ...e, note: n } : e))}
          placeholder="Optional"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
        />
        <Text style={styles.fieldLabel}>Date (YYYY-MM-DD)</Text>
        <TextInput
          value={edit?.date ?? ''}
          onChangeText={(date) => setEdit((e) => (e ? { ...e, date } : e))}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          style={styles.input}
        />
        <View style={styles.actions}>
          <ButtonSecondary label="Delete" style={{ flex: 1 }} onPress={onDelete} />
          <ButtonPrimary label="Save" loading={saving} style={{ flex: 1 }} onPress={onSaveEdit} />
        </View>
        <ButtonSecondary
          label="Cancel"
          style={{ marginTop: 8 }}
          onPress={() => setEdit(null)}
        />
      </KeyboardSheet>
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
    label: {
      fontFamily: typography.uiBold,
      fontSize: 10,
      letterSpacing: 1,
      textTransform: 'uppercase',
      color: colors.teal[300],
      marginBottom: 4,
    },
    total: {
      fontFamily: typography.display,
      fontSize: 28,
      color: colors.teal[300],
      marginBottom: 4,
    },
    metaRow: {
      flexDirection: 'row',
      gap: 18,
      marginTop: 10,
    },
    metaLabel: {
      fontFamily: typography.uiBold,
      fontSize: 10,
      letterSpacing: 1,
      textTransform: 'uppercase',
      color: colors.textMuted,
      marginBottom: 2,
    },
    metaValue: {
      fontFamily: typography.display,
      fontSize: 15,
      color: colors.textPrimary,
    },
    input: {
      height: 38,
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
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 11,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    rowTitle: {
      fontFamily: typography.uiSemiBold,
      fontSize: 13,
      color: colors.textPrimary,
    },
    rowSub: {
      fontFamily: typography.ui,
      fontSize: 11,
      color: colors.textMuted,
    },
    value: {
      fontFamily: typography.display,
      fontSize: 13,
      color: colors.teal[300],
    },
    fieldLabel: {
      fontFamily: typography.uiBold,
      fontSize: 11,
      letterSpacing: 0.4,
      textTransform: 'uppercase',
      color: colors.textMuted,
      marginBottom: 6,
    },
    actions: {
      flexDirection: 'row',
      gap: 8,
    },
  });
}
