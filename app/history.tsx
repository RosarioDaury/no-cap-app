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

export default function HistoryScreen() {
  const router = useRouter();
  const { history, settings } = useDb();
  const currency = settings?.currency ?? 'RD$';
  const max = Math.max(...history.map((h) => h.totalCents), 1);
  const chartWidth = Dimensions.get('window').width - 72;
  const barWidth = history.length ? (chartWidth - (history.length - 1) * 8) / history.length : 0;

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

        {history.length === 0 ? (
          <EmptyState title="No history yet" message="Expense totals by month will show up here." />
        ) : (
          <Card>
            <Text style={styles.cardTitle}>Monthly spend</Text>
            <BodySm style={{ marginBottom: 16 }}>Last {history.length} months with activity</BodySm>
            <Svg width={chartWidth} height={140}>
              {history.map((h, i) => {
                const height = Math.max(6, (h.totalCents / max) * 120);
                const x = i * (barWidth + 8);
                const y = 130 - height;
                return (
                  <Rect
                    key={h.month}
                    x={x}
                    y={y}
                    width={barWidth}
                    height={height}
                    rx={6}
                    fill={colors.teal[500]}
                    opacity={0.45 + (i / Math.max(history.length - 1, 1)) * 0.55}
                  />
                );
              })}
            </Svg>
            <View style={styles.labels}>
              {history.map((h) => (
                <Text key={h.month} style={[styles.label, { width: barWidth }]}>
                  {h.month.slice(5)}
                </Text>
              ))}
            </View>
            <View style={{ marginTop: 16, gap: 8 }}>
              {history.map((h) => (
                <View key={`row-${h.month}`} style={styles.row}>
                  <Text style={styles.rowTitle}>{h.month}</Text>
                  <Text style={styles.rowValue}>{formatMoney(h.totalCents, currency)}</Text>
                </View>
              ))}
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
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rowTitle: {
    fontFamily: typography.ui,
    fontSize: 12,
    color: colors.textSecondary,
  },
  rowValue: {
    fontFamily: typography.display,
    fontSize: 13,
    color: colors.textPrimary,
  },
});
