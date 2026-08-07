import { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import {
  Screen,
  DisplayTitle,
  BodySm,
  Card,
  IconButton,
  EmptyState,
  MonthBarChart,
  currentMonthKey,
} from '@/src/components';
import { useDb } from '@/src/hooks/DbProvider';
import { useTheme } from '@/src/hooks/ThemeProvider';
import { formatMoney } from '@/src/lib/format';
import { ThemeColors, typography } from '@/src/theme/theme';

const MONTH_LONG = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function formatMonthTitle(month: string) {
  const year = Number(month.slice(0, 4));
  const index = Number(month.slice(5, 7)) - 1;
  return `${MONTH_LONG[index]} ${year}`;
}

export default function HistoryScreen() {
  const router = useRouter();
  const { history, incomeHistory, settings, categories } = useDb();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const currency = settings?.currency ?? 'RD$';
  const totalCap = categories.reduce((sum, c) => sum + c.capCents, 0);
  const hasSpend = history.some((h) => h.totalCents > 0);
  const hasIncome = incomeHistory.some((h) => h.totalCents > 0);
  const hasActivity = hasSpend || hasIncome;
  const thisMonth = currentMonthKey();

  const spendPoints = history.map((h) => ({ month: h.month, valueCents: h.totalCents }));
  const incomePoints = incomeHistory.map((h) => ({
    month: h.month,
    valueCents: h.totalCents,
  }));
  const incomeByMonth = new Map(incomeHistory.map((h) => [h.month, h.totalCents]));
  const spendRows = [...history].reverse();
  const incomeRows = [...incomeHistory].reverse();
  const compareRows = [...history]
    .map((h) => {
      const income = incomeByMonth.get(h.month) ?? 0;
      return { month: h.month, spend: h.totalCents, income, net: income - h.totalCents };
    })
    .reverse();

  const spendColor = (point: { month: string; valueCents: number }) => {
    const over = totalCap > 0 && point.valueCents > totalCap;
    if (over) return colors.coral[300];
    if (point.month === thisMonth) return colors.teal[700];
    return colors.border;
  };

  return (
    <Screen edges={['top']} padded={false}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.topbar}>
          <IconButton onPress={() => router.back()} accessibilityLabel="Go back">
            <ArrowLeft size={16} color={colors.textSecondary} />
          </IconButton>
          <DisplayTitle style={{ fontSize: 17 }}>History & trends</DisplayTitle>
          <View style={{ width: 34 }} />
        </View>

        {!hasActivity ? (
          <EmptyState
            title="No history yet"
            message="Expense and income totals by month will show up here."
          />
        ) : (
          <View style={{ gap: 14 }}>
            {hasSpend ? (
              <Card>
                <Text style={styles.cardTitle}>Monthly spend</Text>
                <BodySm style={{ marginBottom: 16, textAlign: 'center' }}>
                  Spending as % of total cap, last {history.length} months
                </BodySm>
                <MonthBarChart
                  primary={spendPoints}
                  maxValue={totalCap > 0 ? totalCap : undefined}
                  colorForPrimary={spendColor}
                />
                <View style={{ marginTop: 18 }}>
                  {spendRows.map((h) => {
                    const over = totalCap > 0 && h.totalCents > totalCap;
                    const under = totalCap > 0 && h.totalCents < totalCap;
                    const saved = totalCap - h.totalCents;
                    const isCurrent = h.month === thisMonth;
                    let status = 'No spend';
                    let statusColor: string = colors.textMuted;
                    if (isCurrent) {
                      status = 'In progress';
                      statusColor = colors.textMuted;
                    } else if (over) {
                      status = 'Over cap';
                      statusColor = colors.coral[500];
                    } else if (under && h.totalCents > 0) {
                      status = `${formatMoney(saved, currency)} saved`;
                      statusColor = colors.teal[700];
                    } else if (totalCap > 0 && h.totalCents === totalCap) {
                      status = 'On cap';
                      statusColor = colors.textSecondary;
                    }
                    return (
                      <View key={`spend-${h.month}`} style={styles.row}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.rowTitle}>{formatMonthTitle(h.month)}</Text>
                          <Text style={[styles.rowSub, { color: statusColor }]}>{status}</Text>
                        </View>
                        <Text style={styles.rowValue}>
                          {totalCap > 0
                            ? `${formatMoney(h.totalCents, currency)} / ${formatMoney(totalCap, currency)}`
                            : formatMoney(h.totalCents, currency)}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </Card>
            ) : null}

            {hasIncome ? (
              <Card>
                <Text style={styles.cardTitle}>Income</Text>
                <BodySm style={{ marginBottom: 16, textAlign: 'center' }}>
                  Monthly income, last {incomeHistory.length} months
                </BodySm>
                <MonthBarChart
                  primary={incomePoints}
                  colorForPrimary={(point) => {
                    if (point.month === thisMonth) return colors.gold[300];
                    if (point.valueCents > 0) return colors.gold[500];
                    return colors.border;
                  }}
                />
                <View style={{ marginTop: 18 }}>
                  {incomeRows.map((h) => (
                    <View key={`income-${h.month}`} style={styles.row}>
                      <Text style={styles.rowTitle}>{formatMonthTitle(h.month)}</Text>
                      <Text style={styles.rowValue}>{formatMoney(h.totalCents, currency)}</Text>
                    </View>
                  ))}
                </View>
              </Card>
            ) : null}

            {hasSpend && hasIncome ? (
              <Card>
                <Text style={styles.cardTitle}>Spend vs income</Text>
                <BodySm style={{ marginBottom: 8, textAlign: 'center' }}>
                  Teal spend · Gold income
                </BodySm>
                <View style={styles.legend}>
                  <View style={styles.legendItem}>
                    <View style={[styles.swatch, { backgroundColor: colors.teal[700] }]} />
                    <BodySm>Spend</BodySm>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.swatch, { backgroundColor: colors.gold[300] }]} />
                    <BodySm>Income</BodySm>
                  </View>
                </View>
                <MonthBarChart
                  primary={spendPoints}
                  secondary={incomePoints}
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
                <View style={{ marginTop: 18 }}>
                  {compareRows.map((row) => {
                    const netPositive = row.net >= 0;
                    return (
                      <View key={`net-${row.month}`} style={styles.row}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.rowTitle}>{formatMonthTitle(row.month)}</Text>
                          <Text
                            style={[
                              styles.rowSub,
                              { color: netPositive ? colors.teal[700] : colors.coral[500] },
                            ]}
                          >
                            Net {netPositive ? '+' : '−'}
                            {formatMoney(Math.abs(row.net), currency)}
                          </Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={styles.rowMeta}>
                            {formatMoney(row.spend, currency)} spend
                          </Text>
                          <Text style={styles.rowMeta}>
                            {formatMoney(row.income, currency)} in
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </Card>
            ) : null}
          </View>
        )}
      </ScrollView>
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
    cardTitle: {
      fontFamily: typography.uiSemiBold,
      fontSize: 14,
      color: colors.textPrimary,
      marginBottom: 4,
    },
    legend: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 16,
      marginBottom: 12,
    },
    legendItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    swatch: {
      width: 10,
      height: 10,
      borderRadius: 3,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
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
      marginTop: 2,
    },
    rowValue: {
      fontFamily: typography.display,
      fontSize: 13,
      color: colors.textPrimary,
      marginLeft: 12,
    },
    rowMeta: {
      fontFamily: typography.ui,
      fontSize: 11,
      color: colors.textSecondary,
      textAlign: 'right',
    },
  });
}
