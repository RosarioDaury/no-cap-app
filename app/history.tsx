import { View, Text, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import Svg, { Rect } from 'react-native-svg';
import {
  Screen,
  DisplayTitle,
  BodySm,
  Card,
  IconButton,
  EmptyState,
} from '@/src/components';
import { useDb } from '@/src/hooks/DbProvider';
import { formatMoney } from '@/src/lib/format';
import { colors, typography } from '@/src/theme/theme';

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

function parseMonth(month: string) {
  const year = Number(month.slice(0, 4));
  const index = Number(month.slice(5, 7)) - 1;
  return { year, index };
}

function formatMonthTitle(month: string) {
  const { year, index } = parseMonth(month);
  return `${MONTH_LONG[index]} ${year}`;
}

function formatMonthShort(month: string) {
  return MONTH_SHORT[parseMonth(month).index];
}

function currentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export default function HistoryScreen() {
  const router = useRouter();
  const { history, settings, categories } = useDb();
  const currency = settings?.currency ?? 'RD$';
  const totalCap = categories.reduce((sum, c) => sum + c.capCents, 0);
  const hasActivity = history.some((h) => h.totalCents > 0);
  const thisMonth = currentMonthKey();
  const chartWidth = Dimensions.get('window').width - 72;
  const barWidth = history.length ? (chartWidth - (history.length - 1) * 8) / history.length : 0;

  const rows = [...history].reverse();

  return (
    <Screen edges={['top']} padded={false}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.topbar}>
          <IconButton onPress={() => router.back()}>
            <ArrowLeft size={16} color={colors.textSecondary} />
          </IconButton>
          <DisplayTitle style={{ fontSize: 17 }}>History & trends</DisplayTitle>
          <View style={{ width: 34 }} />
        </View>

        {!hasActivity ? (
          <EmptyState title="No history yet" message="Expense totals by month will show up here." />
        ) : (
          <Card>
            <Text style={styles.cardTitle}>Monthly spend</Text>
            <BodySm style={{ marginBottom: 16, textAlign: 'center' }}>
              Spending as % of total cap, last {history.length} months
            </BodySm>
            <Svg width={chartWidth} height={140}>
              {history.map((h, i) => {
                const ratio = totalCap > 0 ? h.totalCents / totalCap : 0;
                const height = Math.max(h.totalCents > 0 ? 8 : 4, Math.min(ratio, 1.35) * 110);
                const x = i * (barWidth + 8);
                const y = 130 - height;
                const isCurrent = h.month === thisMonth;
                const over = totalCap > 0 && h.totalCents > totalCap;
                let fill = colors.border;
                if (over) fill = colors.coral[300];
                else if (isCurrent) fill = colors.teal[700];
                else if (h.totalCents > 0) fill = colors.border;
                return (
                  <Rect
                    key={h.month}
                    x={x}
                    y={y}
                    width={barWidth}
                    height={height}
                    rx={5}
                    fill={fill}
                  />
                );
              })}
            </Svg>
            <View style={styles.labels}>
              {history.map((h) => (
                <Text
                  key={h.month}
                  style={[
                    styles.label,
                    { width: barWidth },
                    h.month === thisMonth && styles.labelCurrent,
                  ]}
                >
                  {formatMonthShort(h.month)}
                </Text>
              ))}
            </View>
            <View style={{ marginTop: 18, gap: 0 }}>
              {rows.map((h) => {
                const over = totalCap > 0 && h.totalCents > totalCap;
                const under = totalCap > 0 && h.totalCents < totalCap;
                const saved = totalCap - h.totalCents;
                const isCurrent = h.month === thisMonth;
                let status = 'No spend';
                let statusColor = colors.textMuted;
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
                  <View key={`row-${h.month}`} style={styles.row}>
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
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
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
  labels: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  label: {
    fontFamily: typography.ui,
    fontSize: 10,
    color: colors.textMuted,
    textAlign: 'center',
  },
  labelCurrent: {
    color: colors.textPrimary,
    fontFamily: typography.uiSemiBold,
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
});
