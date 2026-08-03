import { useCallback, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, LayoutAnimation, Platform, UIManager } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import {
  Screen,
  Eyebrow,
  DisplayTitle,
  BodySm,
  Card,
  CapRing,
  QuickAddButton,
  QuickLogPanel,
  EmptyState,
  SectionTitle,
} from '@/src/components';
import { useDb } from '@/src/hooks/DbProvider';
import { formatDisplayDate, formatMoney, progressRatio, tintForProgress } from '@/src/lib/format';
import { colors, typography } from '@/src/theme/theme';
import { CategoryWithSpend } from '@/src/db/types';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function HomeDashboard() {
  const router = useRouter();
  const { settings, categories, logExpense, refresh } = useDb();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const currency = settings?.currency ?? 'RD$';

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const totalCap = categories.reduce((s, c) => s + c.capCents, 0);
  const totalSpent = categories.reduce((s, c) => s + c.spentCents, 0);
  const room = Math.max(0, totalCap - totalSpent);
  const overallProgress = progressRatio(totalSpent, totalCap);

  const toggle = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <Screen edges={['top']} padded={false}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Eyebrow>{formatDisplayDate()}</Eyebrow>
        <DisplayTitle style={{ marginBottom: 14 }}>Hey {settings?.displayName ?? 'there'}</DisplayTitle>

        <Card variant="tint" tint="teal" style={styles.roomCard}>
          <CapRing progress={overallProgress} size={58} strokeWidth={3.5} tint="teal" gradient />
          <View style={{ flex: 1 }}>
            <Eyebrow color={colors.teal[300]} style={{ marginBottom: 2 }}>
              Room left
            </Eyebrow>
            <Text style={styles.roomAmount}>{formatMoney(room, currency)}</Text>
            <BodySm style={{ marginTop: 2 }}>
              {formatMoney(totalSpent, currency)} of {formatMoney(totalCap, currency)} spent
            </BodySm>
          </View>
        </Card>

        <View style={styles.sectionHeader}>
          <SectionTitle style={{ marginBottom: 0 }}>Your caps</SectionTitle>
          <BodySm style={{ color: colors.textMuted }}>Tap + to log fast</BodySm>
        </View>

        {categories.length === 0 ? (
          <EmptyState
            title="No categories yet"
            message="Finish budget setup or add categories in Settings."
          />
        ) : (
          <View style={{ gap: 9 }}>
            {categories.map((cat) => (
              <CategoryCapRow
                key={cat.id}
                cat={cat}
                currency={currency}
                expanded={expandedId === cat.id}
                onToggle={() => toggle(cat.id)}
                onOpen={() => router.push(`/category/${cat.id}`)}
                onSubmit={async (amountCents) => {
                  await logExpense({ categoryId: cat.id, amountCents });
                  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                  setExpandedId(null);
                }}
                onCancel={() => {
                  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                  setExpandedId(null);
                }}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

function CategoryCapRow({
  cat,
  currency,
  expanded,
  onToggle,
  onOpen,
  onSubmit,
  onCancel,
}: {
  cat: CategoryWithSpend;
  currency: string;
  expanded: boolean;
  onToggle: () => void;
  onOpen: () => void;
  onSubmit: (cents: number) => Promise<void>;
  onCancel: () => void;
}) {
  const progress = progressRatio(cat.spentCents, cat.capCents);
  const tint = tintForProgress(progress, cat.tint);
  const over = cat.spentCents >= cat.capCents && cat.capCents > 0;

  return (
    <Card variant={over ? 'tint' : 'default'} tint="coral" style={{ paddingVertical: 12, paddingHorizontal: 13 }}>
      <View style={styles.row}>
        <Pressable onPress={onOpen} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
          <CapRing progress={progress} size={34} tint={tint} />
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>{cat.name}</Text>
            <Text style={styles.rowSub}>
              {formatMoney(cat.spentCents, currency).replace(currency, '')} /{' '}
              {formatMoney(cat.capCents, currency).replace(currency, '')}
            </Text>
          </View>
        </Pressable>
        <QuickAddButton expanded={expanded} onPress={onToggle} />
      </View>
      {expanded ? (
        <QuickLogPanel
          categoryName={cat.name}
          currencySymbol={currency}
          onSubmit={onSubmit}
          onCancel={onCancel}
        />
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 24,
  },
  roomCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 16,
  },
  roomAmount: {
    fontFamily: typography.display,
    fontSize: 22,
    color: colors.teal[300],
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
    marginTop: 1,
  },
});
