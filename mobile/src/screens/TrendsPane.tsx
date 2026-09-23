import { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { EmptyState, currentMonthKey } from '@/src/components';
import { useDb } from '@/src/hooks/DbProvider';
import { useTheme } from '@/src/hooks/ThemeProvider';
import { formatMoney, hasMonthlyCap, progressRatio } from '@/src/lib/format';
import { ThemeColors, type } from '@/src/theme/theme';

const MONTH_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

function formatMonthTitle(month: string) {
  const index = Number(month.slice(5, 7)) - 1;
  return MONTH_SHORT[index] ?? month;
}

export function TrendsPane() {
  const { history, incomeHistory, settings, categories } = useDb();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const currency = settings?.currency ?? 'RD$';
  const capped = categories.filter((c) => hasMonthlyCap(c.capCents));
  const totalCap = capped.reduce((sum, c) => sum + c.capCents, 0);
  const cappedSpentThisMonth = capped.reduce((sum, c) => sum + c.spentCents, 0);
  const hasSpend = history.some((h) => h.totalCents > 0);
  const hasIncome = incomeHistory.some((h) => h.totalCents > 0);
  const thisMonth = currentMonthKey();
  const incomeByMonth = new Map(incomeHistory.map((h) => [h.month, h.totalCents]));
  const spendRows = [...history].reverse();
  const compareRows = [...history]
    .map((h) => {
      const income = incomeByMonth.get(h.month) ?? 0;
      return { month: h.month, spend: h.totalCents, income, net: income - h.totalCents };
    })
    .reverse();
  const maxCompare = Math.max(
    1,
    ...compareRows.flatMap((r) => [r.spend, r.income]),
  );

  if (!hasSpend && !hasIncome) {
    return (
      <ScrollView contentContainerStyle={styles.content}>
        <EmptyState
          title="No history yet"
          message="Expense and income totals by month will show up here."
        />
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      {hasSpend ? (
        <View style={{ marginBottom: 22 }}>
          <Text style={styles.section}>Spend against cap</Text>
          {spendRows.map((h) => {
            const isCurrent = h.month === thisMonth;
            const spendCents = isCurrent ? cappedSpentThisMonth : h.totalCents;
            const over = totalCap > 0 && spendCents > totalCap;
            const under = totalCap > 0 && spendCents < totalCap;
            const saved = totalCap - spendCents;
            let status = 'No spend';
            let statusColor: string = colors.textMuted;
            if (isCurrent) {
              status = 'in progress';
              statusColor = colors.textMuted;
            } else if (over) {
              status = 'over cap';
              statusColor = colors.coral[500];
            } else if (under && spendCents > 0) {
              status = `${formatMoney(saved, currency)} saved`;
              statusColor = colors.teal[700];
            } else if (totalCap > 0 && spendCents === totalCap) {
              status = 'on cap';
              statusColor = colors.textSecondary;
            }
            const pct = totalCap > 0 ? Math.round(progressRatio(spendCents, totalCap) * 100) : 0;
            const bar = Math.min(1, totalCap > 0 ? spendCents / totalCap : 0);
            return (
              <View key={`spend-${h.month}`} style={styles.hairline}>
                <View style={styles.rowTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle}>{formatMonthTitle(h.month)}</Text>
                    <Text style={[styles.meta, { color: statusColor }]}>{status}</Text>
                  </View>
                  <Text style={styles.pct}>{pct}%</Text>
                </View>
                <View style={styles.barRow}>
                  <View style={styles.track}>
                    <View
                      style={[
                        styles.fill,
                        {
                          width: `${bar * 100}%`,
                          backgroundColor: over ? colors.coral[500] : colors.teal[500],
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.barLabel}>
                    {formatMoney(spendCents, currency)}
                    {totalCap > 0 ? ` / ${formatMoney(totalCap, currency)}` : ''}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      ) : null}

      {hasSpend && hasIncome ? (
        <View>
          <Text style={styles.section}>Net by month</Text>
          {compareRows.map((row) => {
            const spendW = row.spend / maxCompare;
            const incomeW = row.income / maxCompare;
            const netPositive = row.net >= 0;
            return (
              <View key={`net-${row.month}`} style={styles.hairline}>
                <View style={styles.rowTop}>
                  <Text style={styles.rowTitle}>{formatMonthTitle(row.month)}</Text>
                  <Text
                    style={[
                      styles.amount,
                      { color: netPositive ? colors.teal[300] : colors.coral[500] },
                    ]}
                  >
                    {netPositive ? '+' : '−'}
                    {formatMoney(Math.abs(row.net), currency)}
                  </Text>
                </View>
                <View style={styles.stack}>
                  <View style={styles.miniTrack}>
                    <View
                      style={[
                        styles.miniFill,
                        { width: `${spendW * 100}%`, backgroundColor: colors.teal[500] },
                      ]}
                    />
                  </View>
                  <View style={styles.miniTrack}>
                    <View
                      style={[
                        styles.miniFill,
                        { width: `${incomeW * 100}%`, backgroundColor: colors.gold[500] },
                      ]}
                    />
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      ) : null}
    </ScrollView>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    content: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 32 },
    section: {
      ...type.meta,
      fontFamily: type.eyebrow.fontFamily,
      letterSpacing: 1.4,
      textTransform: 'uppercase',
      color: colors.textMuted,
      marginBottom: 8,
    },
    hairline: {
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    rowTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    rowTitle: {
      ...type.rowTitle,
      color: colors.textPrimary,
    },
    meta: {
      ...type.meta,
      marginTop: 2,
    },
    pct: {
      ...type.amountSm,
      color: colors.textPrimary,
    },
    amount: {
      ...type.amountSm,
    },
    barRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    track: {
      flex: 1,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.surfaceAlt,
      overflow: 'hidden',
    },
    fill: {
      height: '100%',
      borderRadius: 4,
    },
    barLabel: {
      ...type.meta,
      color: colors.textMuted,
    },
    stack: {
      gap: 4,
    },
    miniTrack: {
      height: 7,
      borderRadius: 4,
      backgroundColor: colors.surfaceAlt,
      overflow: 'hidden',
    },
    miniFill: {
      height: '100%',
      borderRadius: 4,
    },
  });
}
