import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  LayoutAnimation,
  Platform,
  UIManager,
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
} from '@/src/components';
import { useDb } from '@/src/hooks/DbProvider';
import { getCategory, listTransactions } from '@/src/db/repositories';
import { Category, Transaction } from '@/src/db/types';
import { formatMoney, formatShortDate, progressRatio, tintForProgress } from '@/src/lib/format';
import { colors, typography } from '@/src/theme/theme';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function CategoryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { categories, settings, logExpense, refresh } = useDb();
  const currency = settings?.currency ?? 'RD$';
  const live = categories.find((c) => c.id === id);
  const [category, setCategory] = useState<Category | null>(null);
  const [txns, setTxns] = useState<(Transaction & { categoryName?: string })[]>([]);
  const [expanded, setExpanded] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    const cat = await getCategory(id);
    setCategory(cat);
    const list = await listTransactions({ categoryId: id, type: 'expense', limit: 40 });
    setTxns(list);
  }, [id]);

  useEffect(() => {
    load();
  }, [load, live?.spentCents]);

  const spent = live?.spentCents ?? 0;
  const cap = live?.capCents ?? category?.capCents ?? 0;
  const tintBase = live?.tint ?? category?.tint ?? 'teal';
  const progress = progressRatio(spent, cap);
  const tint = tintForProgress(progress, tintBase);
  const name = live?.name ?? category?.name ?? 'Category';

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
              <BodySm>of {formatMoney(cap, currency)} cap</BodySm>
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

        <SectionTitle style={{ marginTop: 18 }}>Recent</SectionTitle>
        {txns.length === 0 ? (
          <EmptyState title="No transactions" message="Tap + to log a spend to this category." />
        ) : (
          <View>
            {txns.map((t, i) => (
              <View key={t.id} style={[styles.txn, i === txns.length - 1 && { borderBottomWidth: 0 }]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.txnTitle}>{t.note || 'Expense'}</Text>
                  <Text style={styles.txnSub}>{formatShortDate(t.date)}</Text>
                </View>
                <Text style={styles.txnValue}>{formatMoney(t.amountCents, currency)}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
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
});
