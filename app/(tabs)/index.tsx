import { useCallback, useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, LayoutAnimation, Platform, UIManager } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Bell, Sparkles } from 'lucide-react-native';
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
  MonthBarChart,
  currentMonthKey,
} from '@/src/components';
import { useDb } from '@/src/hooks/DbProvider';
import { useTheme } from '@/src/hooks/ThemeProvider';
import { formatDisplayDate, formatMoney, progressRatio, tintForProgress } from '@/src/lib/format';
import { capAlertLevel, categoriesAtAlert } from '@/src/lib/capAlerts';
import { buildInsights } from '@/src/lib/insights';
import { ThemeColors, typography } from '@/src/theme/theme';
import { CategoryWithSpend } from '@/src/db/types';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function HomeDashboard() {
  const router = useRouter();
  const { settings, categories, history, incomeHistory, logExpense, refresh } = useDb();
  const { colors, tintPalette } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const currency = settings?.currency ?? 'RD$';
  const threshold = settings?.capAlertThreshold ?? 80;

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const totalCap = categories.reduce((s, c) => s + c.capCents, 0);
  const totalSpent = categories.reduce((s, c) => s + c.spentCents, 0);
  const room = Math.max(0, totalCap - totalSpent);
  const overallProgress = progressRatio(totalSpent, totalCap);

  const alertCats = useMemo(
    () => categoriesAtAlert(categories, threshold),
    [categories, threshold],
  );
  const overCount = alertCats.filter((c) => capAlertLevel(c, threshold) === 'over').length;
  const warnCount = alertCats.length - overCount;

  const insightTeaser = useMemo(() => {
    const cards = buildInsights(categories, currency, threshold);
    return cards.find((c) => c.id !== 'empty') ?? null;
  }, [categories, currency, threshold]);

  const hasTrendActivity = useMemo(
    () =>
      history.some((h) => h.totalCents > 0) || incomeHistory.some((h) => h.totalCents > 0),
    [history, incomeHistory],
  );

  const spendPoints = useMemo(
    () => history.map((h) => ({ month: h.month, valueCents: h.totalCents })),
    [history],
  );
  const incomePoints = useMemo(
    () => incomeHistory.map((h) => ({ month: h.month, valueCents: h.totalCents })),
    [incomeHistory],
  );

  const thisMonth = currentMonthKey();
  const thisMonthSpend = history.find((h) => h.month === thisMonth)?.totalCents ?? totalSpent;
  const thisMonthIncome =
    incomeHistory.find((h) => h.month === thisMonth)?.totalCents ?? 0;

  const toggle = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <Screen edges={['top']} padded={false}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Eyebrow>{formatDisplayDate()}</Eyebrow>
        <DisplayTitle style={{ marginBottom: 14 }}>Hey {settings?.displayName ?? 'there'}</DisplayTitle>

        {alertCats.length > 0 ? (
          <Card variant="tint" tint={overCount > 0 ? 'coral' : 'gold'} style={styles.alertBanner}>
            <Bell size={16} color={overCount > 0 ? colors.coral[500] : colors.gold[500]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.alertTitle}>
                {overCount > 0
                  ? `${overCount} categor${overCount === 1 ? 'y is' : 'ies are'} over cap`
                  : `${warnCount} categor${warnCount === 1 ? 'y' : 'ies'} at ${threshold}%+`}
              </Text>
              <BodySm style={{ color: colors.textPrimary }}>
                {alertCats
                  .slice(0, 3)
                  .map((c) => c.name.split(' ')[0])
                  .join(' · ')}
                {alertCats.length > 3 ? ` +${alertCats.length - 3}` : ''}
              </BodySm>
            </View>
          </Card>
        ) : null}

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

        {hasTrendActivity ? (
          <Pressable
            onPress={() => router.push('/history')}
            style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
            accessibilityRole="button"
            accessibilityLabel="Open history and trends"
          >
            <Card style={styles.trendsCard}>
              <View style={styles.trendsHeader}>
                <Text style={styles.trendsTitle}>Last 6 months</Text>
                <BodySm style={{ color: colors.textMuted }}>See all</BodySm>
              </View>
              <MonthBarChart
                primary={spendPoints}
                secondary={incomePoints}
                chartHeight={90}
                colorForPrimary={(point) => {
                  if (point.month === thisMonth) return colors.teal[700];
                  if (point.valueCents > 0) return colors.teal[500];
                  return colors.border;
                }}
                colorForSecondary={(point) => {
                  if (point.month === thisMonth) return colors.gold[300];
                  if (point.valueCents > 0) return colors.gold[500];
                  return colors.border;
                }}
              />
              <BodySm style={{ marginTop: 10, color: colors.textSecondary }}>
                This month · {formatMoney(thisMonthSpend, currency)} spent
                {thisMonthIncome > 0
                  ? ` · ${formatMoney(thisMonthIncome, currency)} in`
                  : ''}
              </BodySm>
            </Card>
          </Pressable>
        ) : null}

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
                threshold={threshold}
                expanded={expandedId === cat.id}
                onToggle={() => toggle(cat.id)}
                onOpen={() => router.push(`/category/${cat.id}`)}
                onSubmit={async (amountCents, note) => {
                  await logExpense({ categoryId: cat.id, amountCents, note });
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

        {insightTeaser ? (
          <Pressable
            onPress={() => router.push('/(tabs)/insights')}
            style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
            accessibilityRole="button"
            accessibilityLabel={`Insight: ${insightTeaser.body}`}
          >
            <Card
              variant="tint"
              tint={insightTeaser.tone === 'coral' ? 'coral' : 'gold'}
              style={styles.insightTeaser}
            >
              <Sparkles
                size={15}
                color={
                  insightTeaser.tone === 'coral'
                    ? tintPalette.coral[300]
                    : tintPalette.gold[300]
                }
              />
              <BodySm
                style={{
                  flex: 1,
                  color:
                    insightTeaser.tone === 'coral'
                      ? tintPalette.coral[300]
                      : tintPalette.gold[300],
                }}
              >
                {insightTeaser.body}
              </BodySm>
            </Card>
          </Pressable>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

function CategoryCapRow({
  cat,
  currency,
  threshold,
  expanded,
  onToggle,
  onOpen,
  onSubmit,
  onCancel,
}: {
  cat: CategoryWithSpend;
  currency: string;
  threshold: number;
  expanded: boolean;
  onToggle: () => void;
  onOpen: () => void;
  onSubmit: (cents: number, note?: string) => Promise<void>;
  onCancel: () => void;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const progress = progressRatio(cat.spentCents, cat.capCents);
  const tint = tintForProgress(progress, cat.tint);
  const level = capAlertLevel(cat, threshold);
  const over = level === 'over';
  const warning = level === 'warning';

  return (
    <Card
      variant={over ? 'tint' : warning ? 'tint' : 'default'}
      tint={over ? 'coral' : 'gold'}
      style={{ paddingVertical: 12, paddingHorizontal: 13 }}
    >
      <View style={styles.row}>
        <Pressable onPress={onOpen} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
          <CapRing progress={progress} size={34} tint={tint} />
          <View style={{ flex: 1 }}>
            <View style={styles.titleRow}>
              <Text style={styles.rowTitle}>{cat.name}</Text>
              {over ? (
                <View style={[styles.badge, styles.badgeOver]}>
                  <Text style={styles.badgeText}>Over</Text>
                </View>
              ) : warning ? (
                <View style={[styles.badge, styles.badgeWarn]}>
                  <Text style={styles.badgeText}>{Math.round(progress * 100)}%</Text>
                </View>
              ) : null}
            </View>
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

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    content: {
      paddingHorizontal: 20,
      paddingTop: 10,
      paddingBottom: 24,
    },
    alertBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: 12,
      paddingVertical: 12,
    },
    alertTitle: {
      fontFamily: typography.uiSemiBold,
      fontSize: 13,
      color: colors.textPrimary,
      marginBottom: 2,
    },
    roomCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      marginBottom: 16,
    },
    trendsCard: {
      marginBottom: 16,
      paddingVertical: 14,
    },
    trendsHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 10,
    },
    trendsTitle: {
      fontFamily: typography.uiSemiBold,
      fontSize: 14,
      color: colors.textPrimary,
    },
    roomAmount: {
      fontFamily: typography.display,
      fontSize: 22,
      color: colors.teal[300],
    },
    insightTeaser: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginTop: 12,
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
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
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
    badge: {
      paddingHorizontal: 7,
      paddingVertical: 2,
      borderRadius: 8,
    },
    badgeOver: {
      backgroundColor: colors.coral[50],
    },
    badgeWarn: {
      backgroundColor: colors.gold[50],
    },
    badgeText: {
      fontFamily: typography.uiBold,
      fontSize: 10,
      color: colors.textPrimary,
    },
  });
}
