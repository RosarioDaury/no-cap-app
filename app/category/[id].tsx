import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  LayoutAnimation,
  Platform,
  UIManager,
  Modal,
  Alert,
  Pressable,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import {
  Screen,
  DisplayTitle,
  BodySm,
  Card,
  CapRing,
  QuickAddButton,
  QuickLogPanel,
  IconButton,
  EmptyState,
  SectionTitle,
  ButtonPrimary,
  ButtonSecondary,
  Chip,
} from '@/src/components';
import { useDb } from '@/src/hooks/DbProvider';
import { getCategory, listTransactions } from '@/src/db/repositories';
import { Category, Transaction } from '@/src/db/types';
import {
  formatMoney,
  formatShortDate,
  parseMoneyInput,
  progressRatio,
  tintForProgress,
} from '@/src/lib/format';
import { colors, typography } from '@/src/theme/theme';

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
    settings,
    logExpense,
    refresh,
    saveCategory,
    saveTransaction,
    removeTransaction,
  } = useDb();
  const currency = settings?.currency ?? 'RD$';
  const live = categories.find((c) => c.id === id);
  const [category, setCategory] = useState<Category | null>(null);
  const [txns, setTxns] = useState<TxnRow[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [capModal, setCapModal] = useState(false);
  const [capText, setCapText] = useState('');
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
  }, [load, live?.spentCents, live?.capCents]);

  const spent = live?.spentCents ?? 0;
  const cap = live?.capCents ?? category?.capCents ?? 0;
  const tintBase = live?.tint ?? category?.tint ?? 'teal';
  const progress = progressRatio(spent, cap);
  const tint = tintForProgress(progress, tintBase);
  const name = live?.name ?? category?.name ?? 'Category';

  const openEditCap = () => {
    setCapText(cap ? String(cap / 100) : '');
    setCapModal(true);
  };

  const saveCap = async () => {
    const source = live ?? category;
    if (!source || !id) return;
    setSavingCap(true);
    try {
      await saveCategory({
        id,
        name: source.name,
        icon: source.icon,
        tint: source.tint,
        capCents: parseMoneyInput(capText),
        sortOrder: source.sortOrder,
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
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.topbar}>
          <IconButton onPress={() => router.back()}>
            <ArrowLeft size={16} color={colors.textSecondary} />
          </IconButton>
          <DisplayTitle style={{ fontSize: 17 }}>{name}</DisplayTitle>
          <View style={{ width: 34 }} />
        </View>

        <Card variant={progress >= 1 ? 'tint' : 'default'} tint="coral" style={styles.summary}>
          <View style={styles.summaryRow}>
            <CapRing progress={progress} size={58} strokeWidth={3.5} tint={tint} />
            <View style={{ flex: 1 }}>
              <Text style={styles.amount}>{formatMoney(spent, currency)}</Text>
              <BodySm>
                of {formatMoney(cap, currency)} · {Math.round(progress * 100)}%
              </BodySm>
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
              onCancel={() => {
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                setExpanded(false);
              }}
              onSubmit={async (amountCents) => {
                if (!id) return;
                await logExpense({ categoryId: id, amountCents });
                await refresh();
                await load();
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                setExpanded(false);
              }}
            />
          ) : null}
        </Card>

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

        <ButtonSecondary label="Edit cap" onPress={openEditCap} style={{ marginTop: 20 }} />
      </ScrollView>

      <Modal visible={capModal} transparent animationType="slide">
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <DisplayTitle style={{ fontSize: 18, marginBottom: 8 }}>Edit cap</DisplayTitle>
            <BodySm style={{ marginBottom: 12 }}>Monthly limit for {name}</BodySm>
            <TextInput
              value={capText}
              onChangeText={setCapText}
              placeholder={`${currency}0`}
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
              style={styles.input}
              autoFocus
            />
            <View style={styles.actions}>
              <ButtonSecondary
                label="Cancel"
                style={{ flex: 1 }}
                onPress={() => setCapModal(false)}
              />
              <ButtonPrimary label="Save" loading={savingCap} style={{ flex: 1 }} onPress={saveCap} />
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={!!edit} transparent animationType="slide">
        <View style={styles.backdrop}>
          <ScrollView contentContainerStyle={styles.sheetScroll} keyboardShouldPersistTaps="handled">
            <View style={styles.sheet}>
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
                {categories.map((c) => (
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
            </View>
          </ScrollView>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
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
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  amount: {
    fontFamily: typography.display,
    fontSize: 22,
    color: colors.textPrimary,
  },
  txn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  txnTitle: {
    fontFamily: typography.uiSemiBold,
    fontSize: 13,
    color: colors.textPrimary,
  },
  txnSub: {
    fontFamily: typography.ui,
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
  },
  txnValue: {
    fontFamily: typography.display,
    fontSize: 13,
    color: colors.textPrimary,
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
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
});
