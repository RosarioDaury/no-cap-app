import { useCallback, useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet, LayoutAnimation, Platform, UIManager } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Bell, ChevronRight } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Screen,
  EmptyState,
  KeyboardFormScroll,
  BrandMark,
  HeaderGear,
  CategoryIcon,
  QuickAddButton,
  QuickLogPanel,
} from '@/src/components';
import { useDb } from '@/src/hooks/DbProvider';
import { useTheme } from '@/src/hooks/ThemeProvider';
import { daysLeftInMonth, formatMoney, progressRatio, tintForProgress } from '@/src/lib/format';
import { capAlertLevel, categoriesAtAlert } from '@/src/lib/capAlerts';
import { ThemeColors, type, typography } from '@/src/theme/theme';
import { CategoryWithSpend } from '@/src/db/types';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function HomeDashboard() {
  const router = useRouter();
  const { settings, categories, logExpense, refresh } = useDb();
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
  const overage = Math.max(0, totalSpent - totalCap);
  const overallProgress = progressRatio(totalSpent, totalCap);
  const daysLeft = daysLeftInMonth();
  const perDay = Math.floor(room / Math.max(1, daysLeft) / 100) * 100;
  const overCaps = totalCap > 0 && room === 0;
  const monthName = new Date().toLocaleDateString('en-US', { month: 'long' });

  const alertCats = useMemo(
    () => categoriesAtAlert(categories, threshold),
    [categories, threshold],
  );
  const overCount = alertCats.filter((c) => capAlertLevel(c, threshold) === 'over').length;
  const lead = alertCats[0];
  const leadPct = lead ? Math.round(progressRatio(lead.spentCents, lead.capCents) * 100) : 0;

  const toggle = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <Screen edges={['top']} padded={false}>
      <KeyboardFormScroll
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <BrandMark size={28} />
            <View>
              <Text style={styles.greeting}>Hey {settings?.displayName ?? 'there'}</Text>
              <Text style={styles.month}>{monthName}</Text>
            </View>
          </View>
          <HeaderGear onPress={() => router.push('/(tabs)/settings')} />
        </View>

        <View style={styles.hero}>
          <Text style={styles.heroEyebrow}>
            {overCaps ? 'Over your caps' : 'Safe to spend · per day'}
          </Text>
          <Text style={[styles.heroAmount, overCaps && { color: colors.coral[500] }]}>
            {formatMoney(overCaps ? overage : perDay, currency)}
          </Text>
          <Text style={styles.heroBody}>
            {formatMoney(room, currency)} room left · {daysLeft} day{daysLeft === 1 ? '' : 's'} to go
          </Text>
          <View style={styles.heroTrack}>
            <LinearGradient
              colors={[colors.teal[700], colors.teal[500]]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.heroFill, { width: `${overallProgress * 100}%` }]}
            />
          </View>
          <View style={styles.heroMeta}>
            <Text style={styles.heroMetaText}>{formatMoney(totalSpent, currency)} spent</Text>
            <Text style={styles.heroMetaText}>
              {Math.round(overallProgress * 100)}% of {formatMoney(totalCap, currency)}
            </Text>
          </View>
        </View>

        {lead ? (
          <Pressable
            onPress={() => router.push('/(tabs)/insights')}
            style={[styles.alert, overCount > 0 ? styles.alertCoral : styles.alertGold]}
            accessibilityRole="button"
            accessibilityLabel="Open insights"
          >
            <Bell size={15} color={overCount > 0 ? colors.coral[500] : colors.gold[500]} />
            <Text
              style={[
                styles.alertText,
                { color: overCount > 0 ? colors.coral[300] : colors.gold[300] },
              ]}
              numberOfLines={1}
            >
              {overCount > 0
                ? `Fun is over · ${lead.name} at ${leadPct}%`
                : `${lead.name} at ${leadPct}%`}
            </Text>
            <ChevronRight
              size={16}
              color={overCount > 0 ? colors.coral[300] : colors.gold[300]}
            />
          </Pressable>
        ) : null}

        {categories.length === 0 ? (
          <EmptyState
            title="No categories yet"
            message="Finish budget setup or add categories in Settings."
          />
        ) : (
          <View style={styles.list}>
            {categories.map((cat) => (
              <CategoryCapRow
                key={cat.id}
                cat={cat}
                currency={currency}
                threshold={threshold}
                expanded={expandedId === cat.id}
                onOpen={() => router.push(`/category/${cat.id}`)}
                onToggle={() => toggle(cat.id)}
                onSubmit={async (amountCents, note) => {
                  await logExpense({ categoryId: cat.id, amountCents, note });
                  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                  setExpandedId(null);
                }}
                onCancel={() => {
                  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                  setExpandedId(null);
                }}
                tint50={tintPalette[cat.tint][50]}
              />
            ))}
          </View>
        )}
      </KeyboardFormScroll>
    </Screen>
  );
}

function CategoryCapRow({
  cat,
  currency,
  threshold,
  expanded,
  onOpen,
  onToggle,
  onSubmit,
  onCancel,
  tint50,
}: {
  cat: CategoryWithSpend;
  currency: string;
  threshold: number;
  expanded: boolean;
  onOpen: () => void;
  onToggle: () => void;
  onSubmit: (cents: number, note?: string) => Promise<void>;
  onCancel: () => void;
  tint50: string;
}) {
  const { colors, tintPalette } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const progress = progressRatio(cat.spentCents, cat.capCents);
  const tint = tintForProgress(progress, cat.tint);
  const over = capAlertLevel(cat, threshold) === 'over';
  const remaining = cat.capCents - cat.spentCents;
  const remainingColor =
    remaining < 0
      ? colors.coral[500]
      : remaining / Math.max(1, cat.capCents) <= 0.2
        ? colors.gold[300]
        : colors.teal[300];

  return (
    <View style={[styles.tile, over && styles.tileOver]}>
      <View style={styles.row}>
        <Pressable
          onPress={onOpen}
          style={({ pressed }) => [styles.rowMain, { opacity: pressed ? 0.72 : 1 }]}
          accessibilityRole="button"
          accessibilityLabel={`${cat.name}, ${formatMoney(Math.abs(remaining), currency)} ${remaining < 0 ? 'over' : 'left'}`}
        >
          <View style={[styles.iconChip, { backgroundColor: tint50 }]}>
            <CategoryIcon name={cat.icon} tint={cat.tint} size={16} shade={500} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle} numberOfLines={1}>
              {cat.name}
            </Text>
            <Text style={styles.rowSub}>
              {formatMoney(cat.spentCents, currency)} of {formatMoney(cat.capCents, currency)}
            </Text>
          </View>
          <View style={styles.rightCol}>
            <Text style={[styles.leftAmt, { color: remainingColor }]}>
              {formatMoney(Math.abs(remaining), currency)}
            </Text>
            <Text style={[styles.leftLabel, remaining < 0 && { color: colors.coral[300] }]}>
              {remaining < 0 ? 'over' : 'left'}
            </Text>
          </View>
        </Pressable>
        <QuickAddButton expanded={expanded} onPress={onToggle} />
      </View>
      <View style={styles.capTrack}>
        <View
          style={[
            styles.capFill,
            {
              width: `${Math.min(100, progress * 100)}%`,
              backgroundColor: tintPalette[tint][500],
            },
          ]}
        />
      </View>
      {expanded ? (
        <QuickLogPanel
          categoryName={cat.name}
          currencySymbol={currency}
          remainingCapCents={remaining}
          onSubmit={onSubmit}
          onCancel={onCancel}
        />
      ) : null}
    </View>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    content: {
      paddingHorizontal: 20,
      paddingTop: 10,
      paddingBottom: 24,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 22,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    greeting: {
      ...type.title,
      fontSize: 26,
      fontFamily: typography.displayBold,
      color: colors.textPrimary,
    },
    month: {
      ...type.body,
      fontSize: 15,
      color: colors.textSecondary,
      marginTop: 1,
    },
    hero: {
      marginBottom: 16,
    },
    heroEyebrow: {
      ...type.eyebrow,
      color: colors.textMuted,
      marginBottom: 4,
    },
    heroAmount: {
      ...type.hero,
      color: colors.textPrimary,
    },
    heroBody: {
      ...type.body,
      color: colors.textSecondary,
      marginTop: 4,
      marginBottom: 12,
    },
    heroTrack: {
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.surfaceAlt,
      overflow: 'hidden',
    },
    heroFill: {
      height: '100%',
      borderRadius: 3,
    },
    heroMeta: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 8,
    },
    heroMetaText: {
      fontFamily: type.meta.fontFamily,
      fontSize: 10.5,
      color: colors.textMuted,
    },
    alert: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      borderRadius: 16,
      paddingVertical: 12,
      paddingHorizontal: 14,
      marginBottom: 18,
    },
    alertCoral: {
      backgroundColor: 'rgba(251,68,99,0.1)',
    },
    alertGold: {
      backgroundColor: 'rgba(245,166,35,0.1)',
    },
    alertText: {
      flex: 1,
      fontFamily: type.rowTitle.fontFamily,
      fontSize: 12.5,
    },
    list: {
      gap: 8,
    },
    tile: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      paddingHorizontal: 14,
      paddingTop: 14,
      paddingBottom: 12,
    },
    tileOver: {
      backgroundColor: 'rgba(251,68,99,0.08)',
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    rowMain: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    iconChip: {
      width: 36,
      height: 36,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rowTitle: {
      ...type.rowTitle,
      color: colors.textPrimary,
    },
    rowSub: {
      ...type.meta,
      color: colors.textMuted,
      marginTop: 2,
    },
    rightCol: {
      alignItems: 'flex-end',
    },
    leftAmt: {
      ...type.amountSm,
    },
    leftLabel: {
      ...type.meta,
      color: colors.textMuted,
      marginTop: 1,
    },
    capTrack: {
      height: 3,
      borderRadius: 2,
      backgroundColor: colors.surfaceAlt,
      overflow: 'hidden',
      marginTop: 12,
    },
    capFill: {
      height: '100%',
      borderRadius: 2,
    },
  });
}
