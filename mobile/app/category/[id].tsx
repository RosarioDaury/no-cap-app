import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  LayoutAnimation,
  Platform,
  UIManager,
  Alert,
  Pressable,
  Switch,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import {
  Screen,
  DisplayTitle,
  BodySm,
  CapRing,
  QuickAddButton,
  QuickLogPanel,
  IconButton,
  EmptyState,
  SectionTitle,
  ButtonPrimary,
  ButtonSecondary,
  Chip,
  KeyboardSheet,
  KeyboardFormScroll,
} from '@/src/components';
import { useDb } from '@/src/hooks/DbProvider';
import { useTheme } from '@/src/hooks/ThemeProvider';
import { getCategory, listTransactions } from '@/src/db/repositories';
import { Category, Transaction } from '@/src/db/types';
import {
  formatMoney,
  formatShortDate,
  hasMonthlyCap,
  parseMoneyInput,
  progressRatio,
  tintForProgress,
} from '@/src/lib/format';
import {
  CategoryDuration,
  activeMonthFromDuration,
  categoryDurationLabel,
  durationFromActiveMonth,
} from '@/src/lib/categories';
import { ThemeColors, type, typography } from '@/src/theme/theme';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type TxnRow = Transaction & { categoryName?: string };

type EditDraft = {
  id: string;
  amountText: string;
  note: string;
  date: string;
  categoryId: string | null;
  type: 'expense' | 'income';
};

export default function CategoryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const {
    categories,
    allCategories,
    settings,
    logExpense,
    refresh,
    saveCategory,
    saveTransaction,
    removeTransaction,
  } = useDb();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const currency = settings?.currency ?? 'RD$';
  const live = allCategories.find((c) => c.id === id) ?? categories.find((c) => c.id === id);
  const [category, setCategory] = useState<Category | null>(null);
  const [txns, setTxns] = useState<TxnRow[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [capModal, setCapModal] = useState(false);
  const [capText, setCapText] = useState('');
  const [noLimit, setNoLimit] = useState(false);
  const [duration, setDuration] = useState<CategoryDuration>('ongoing');
  const [customMonth, setCustomMonth] = useState<string | null>(null);
  const [savingCap, setSavingCap] = useState(false);
  const [edit, setEdit] = useState<EditDraft | null>(null);
  const [savingTxn, setSavingTxn] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    const cat = await getCategory(id);
    setCategory(cat);
    const list = await listTransactions({ categoryId: id, type: 'expense', limit: 40 });
    setTxns(list);
  }, [id]);

  useEffect(() => {
    load();
  }, [load, live?.spentCents, live?.capCents, live?.activeMonth]);

  const spent = live?.spentCents ?? 0;
  const cap = live?.capCents ?? category?.capCents ?? 0;
  const capped = hasMonthlyCap(cap);
  const tintBase = live?.tint ?? category?.tint ?? 'teal';
  const progress = progressRatio(spent, cap);
  const tint = capped ? tintForProgress(progress, tintBase) : tintBase;
  const name = live?.name ?? category?.name ?? 'Category';
  const activeMonth = live?.activeMonth ?? category?.activeMonth ?? null;

  const openEditCap = () => {
    const source = live ?? category;
    setCapText(capped ? String(cap / 100) : '');
    setNoLimit(!capped);
    setDuration(durationFromActiveMonth(source?.activeMonth ?? null));
    setCustomMonth(source?.activeMonth ?? null);
    setCapModal(true);
  };

  const saveCap = async () => {
    const source = live ?? category;
    if (!source || !id) return;
    const capCents = noLimit ? 0 : parseMoneyInput(capText);
    if (!noLimit && capCents <= 0) {
      Alert.alert('Monthly cap', 'Enter a cap, or turn on no monthly limit.');
      return;
    }
    setSavingCap(true);
    try {
      await saveCategory({
        id,
        name: source.name,
        icon: source.icon,
        tint: source.tint,
        capCents,
        sortOrder: source.sortOrder,
        activeMonth: activeMonthFromDuration(duration, customMonth),
      });
      await load();
      setCapModal(false);
    } catch {
      Alert.alert('Could not save cap', 'Try again.');
    } finally {
      setSavingCap(false);
    }
  };

  const openEditTxn = (t: TxnRow) => {
    setEdit({
      id: t.id,
      amountText: String(t.amountCents / 100),
      note: t.note,
      date: t.date,
      categoryId: t.categoryId,
      type: t.type,
    });
  };

  const onSaveTxn = async () => {
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
    setSavingTxn(true);
    try {
      await saveTransaction({
        id: edit.id,
        categoryId: edit.categoryId,
        amountCents,
        note: edit.note,
        date: edit.date.trim(),
        type: edit.type,
      });
      await load();
      setEdit(null);
    } catch {
      Alert.alert('Could not save', 'Try again.');
    } finally {
      setSavingTxn(false);
    }
  };

  const onDeleteTxn = () => {
    if (!edit) return;
    Alert.alert('Delete expense?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await removeTransaction(edit.id);
            await load();
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
          <DisplayTitle style={{ fontSize: 17 }}>{name}</DisplayTitle>
          <View style={{ width: 36 }} />
        </View>

        <View style={styles.summary}>
          <View style={styles.summaryRow}>
            <CapRing progress={progress} size={58} strokeWidth={3.5} tint={tint} />
            <View style={{ flex: 1 }}>
              <Text style={styles.amount}>{formatMoney(spent, currency)}</Text>
              <View style={styles.pctRow}>
                <BodySm>
                  {capped
                    ? `of ${formatMoney(cap, currency)} · ${Math.round(progress * 100)}%`
                    : 'No monthly limit'}
                  {activeMonth ? ` · ${categoryDurationLabel(activeMonth)}` : ''}
                </BodySm>
                <Pressable onPress={openEditCap} hitSlop={8}>
                  <Text style={styles.editCap}>{capped ? 'Edit cap' : 'Edit'}</Text>
                </Pressable>
              </View>
            </View>
            <QuickAddButton
              expanded={expanded}
              onPress={() => {
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                setExpanded((v) => !v);
              }}
            />
          </View>
          {expanded ? (
            <QuickLogPanel
              categoryName={name}
              currencySymbol={currency}
              remainingCapCents={capped ? cap - spent : undefined}
              onCancel={() => {
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                setExpanded(false);
              }}
              onSubmit={async (amountCents, note) => {
                if (!id) return;
                await logExpense({ categoryId: id, amountCents, note });
                await refresh();
                await load();
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                setExpanded(false);
              }}
            />
          ) : null}
        </View>

        <SectionTitle style={{ marginTop: 18 }}>This month</SectionTitle>
        {txns.length === 0 ? (
          <EmptyState title="No transactions" message="Tap + to log a spend to this category." />
        ) : (
          <View>
            {txns.map((t, i) => (
              <Pressable
                key={t.id}
                onPress={() => openEditTxn(t)}
                style={[styles.txn, i === txns.length - 1 && { borderBottomWidth: 0 }]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.txnTitle}>{t.note || 'Expense'}</Text>
                  <Text style={styles.txnSub}>{formatShortDate(t.date)} · tap to edit</Text>
                </View>
                <Text style={styles.txnValue}>{formatMoney(t.amountCents, currency)}</Text>
              </Pressable>
            ))}
          </View>
        )}

      </KeyboardFormScroll>

      <KeyboardSheet visible={capModal} onRequestClose={() => setCapModal(false)} scroll>
        <DisplayTitle style={{ fontSize: 18, marginBottom: 8 }}>Edit category</DisplayTitle>
        <BodySm style={{ marginBottom: 12 }}>{name}</BodySm>
        <View style={styles.switchRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.switchTitle}>No monthly limit</Text>
          </View>
          <Switch
            value={noLimit}
            onValueChange={setNoLimit}
            trackColor={{ false: colors.surfaceAlt, true: colors.teal[700] }}
            thumbColor={noLimit ? colors.teal[300] : colors.textMuted}
          />
        </View>
        {noLimit ? null : (
          <TextInput
            value={capText}
            onChangeText={setCapText}
            placeholder={`${currency}0`}
            placeholderTextColor={colors.textMuted}
            keyboardType="decimal-pad"
            style={styles.input}
            autoFocus
          />
        )}
        <Text style={styles.label}>How long</Text>
        <View style={styles.chips}>
          <Chip
            label="Ongoing"
            selected={duration === 'ongoing'}
            onPress={() => setDuration('ongoing')}
          />
          <Chip
            label="This month only"
            selected={duration === 'this-month'}
            onPress={() => setDuration('this-month')}
          />
          <Chip
            label="Next month only"
            selected={duration === 'next-month'}
            onPress={() => setDuration('next-month')}
          />
          {duration === 'custom' && customMonth ? (
            <Chip label={categoryDurationLabel(customMonth)} selected />
          ) : null}
        </View>
        <View style={styles.actions}>
          <ButtonSecondary
            label="Cancel"
            style={{ flex: 1 }}
            onPress={() => setCapModal(false)}
          />
          <ButtonPrimary label="Save" loading={savingCap} style={{ flex: 1 }} onPress={saveCap} />
        </View>
      </KeyboardSheet>

      <KeyboardSheet visible={!!edit} onRequestClose={() => setEdit(null)} scroll>
        <DisplayTitle style={{ fontSize: 18, marginBottom: 12 }}>Edit expense</DisplayTitle>

        <Text style={styles.label}>Amount</Text>
        <TextInput
          value={edit?.amountText ?? ''}
          onChangeText={(amountText) => setEdit((e) => (e ? { ...e, amountText } : e))}
          placeholder={`${currency}0`}
          placeholderTextColor={colors.textMuted}
          keyboardType="decimal-pad"
          style={styles.input}
        />

        <Text style={styles.label}>Note</Text>
        <TextInput
          value={edit?.note ?? ''}
          onChangeText={(note) => setEdit((e) => (e ? { ...e, note } : e))}
          placeholder="Optional"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
        />

        <Text style={styles.label}>Date (YYYY-MM-DD)</Text>
        <TextInput
          value={edit?.date ?? ''}
          onChangeText={(date) => setEdit((e) => (e ? { ...e, date } : e))}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          style={styles.input}
        />

        <Text style={styles.label}>Category</Text>
        <View style={styles.chips}>
          {allCategories.map((c) => (
            <Chip
              key={c.id}
              label={c.name.split(' ')[0]}
              selected={edit?.categoryId === c.id}
              onPress={() => setEdit((e) => (e ? { ...e, categoryId: c.id } : e))}
            />
          ))}
        </View>

        <View style={styles.actions}>
          <ButtonSecondary label="Delete" style={{ flex: 1 }} onPress={onDeleteTxn} />
          <ButtonPrimary
            label="Save"
            loading={savingTxn}
            style={{ flex: 1 }}
            onPress={onSaveTxn}
          />
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
    content: {
      paddingHorizontal: 20,
      paddingTop: 8,
      paddingBottom: 32,
    },
    topbar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    summary: {
      paddingVertical: 8,
      marginBottom: 8,
    },
    summaryRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
    },
    amount: {
      ...type.display,
      color: colors.textPrimary,
    },
    pctRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginTop: 2,
    },
    editCap: {
      ...type.meta,
      color: colors.teal[300],
      textDecorationLine: 'underline',
    },
    txn: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 11,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    txnTitle: {
      ...type.rowTitle,
      color: colors.textPrimary,
    },
    txnSub: {
      ...type.meta,
      color: colors.textMuted,
      marginTop: 1,
    },
    txnValue: {
      ...type.amountSm,
      color: colors.textPrimary,
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
    chips: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 14,
    },
    switchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 12,
    },
    switchTitle: {
      fontFamily: typography.uiSemiBold,
      fontSize: 13,
      color: colors.textPrimary,
    },
    actions: {
      flexDirection: 'row',
      gap: 8,
    },
  });
}
