import { useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { ThemeColors, typography } from '@/src/theme/theme';
import { useTheme } from '@/src/hooks/ThemeProvider';

export type MonthBarPoint = {
  month: string;
  valueCents: number;
};

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

export function formatMonthShort(month: string): string {
  const index = Number(month.slice(5, 7)) - 1;
  return MONTH_SHORT[index] ?? month.slice(5);
}

export function currentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

type MonthBarChartProps = {
  primary: MonthBarPoint[];
  secondary?: MonthBarPoint[];
  maxValue?: number;
  secondaryMaxValue?: number;
  colorForPrimary?: (point: MonthBarPoint, index: number) => string;
  colorForSecondary?: (point: MonthBarPoint, index: number) => string;
  chartHeight?: number;
  horizontalInset?: number;
};

export function MonthBarChart({
  primary,
  secondary,
  maxValue,
  secondaryMaxValue,
  colorForPrimary,
  colorForSecondary,
  chartHeight = 140,
  horizontalInset = 72,
}: MonthBarChartProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const chartWidth = Dimensions.get('window').width - horizontalInset;
  const gap = 8;
  const count = primary.length;
  const groupWidth = count ? (chartWidth - (count - 1) * gap) / count : 0;
  const paired = !!secondary && secondary.length === primary.length;
  const barGap = paired ? 3 : 0;
  const barWidth = paired ? (groupWidth - barGap) / 2 : groupWidth;

  const primaryMax = maxValue ?? Math.max(...primary.map((p) => p.valueCents), 1);
  const secondaryMax =
    secondaryMaxValue ?? Math.max(...(secondary?.map((p) => p.valueCents) ?? [0]), 1);

  const plotHeight = chartHeight - 10;
  const thisMonth = currentMonthKey();

  const defaultPrimaryColor = (point: MonthBarPoint) => {
    if (point.month === thisMonth) return colors.teal[700];
    return colors.border;
  };

  const defaultSecondaryColor = (point: MonthBarPoint) => {
    if (point.month === thisMonth) return colors.gold[300];
    if (point.valueCents > 0) return colors.gold[500];
    return colors.border;
  };

  return (
    <View>
      <Svg width={chartWidth} height={chartHeight}>
        {primary.map((point, i) => {
          const ratio = primaryMax > 0 ? point.valueCents / primaryMax : 0;
          const height = Math.max(
            point.valueCents > 0 ? 8 : 4,
            Math.min(ratio, 1.35) * plotHeight,
          );
          const groupX = i * (groupWidth + gap);
          const y = chartHeight - height;
          const fill = (colorForPrimary ?? defaultPrimaryColor)(point, i);
          return (
            <Rect
              key={`p-${point.month}`}
              x={groupX}
              y={y}
              width={barWidth}
              height={height}
              rx={5}
              fill={fill}
            />
          );
        })}
        {paired
          ? secondary!.map((point, i) => {
              const ratio = secondaryMax > 0 ? point.valueCents / secondaryMax : 0;
              const height = Math.max(
                point.valueCents > 0 ? 8 : 4,
                Math.min(ratio, 1.35) * plotHeight,
              );
              const groupX = i * (groupWidth + gap);
              const y = chartHeight - height;
              const fill = (colorForSecondary ?? defaultSecondaryColor)(point, i);
              return (
                <Rect
                  key={`s-${point.month}`}
                  x={groupX + barWidth + barGap}
                  y={y}
                  width={barWidth}
                  height={height}
                  rx={5}
                  fill={fill}
                />
              );
            })
          : null}
      </Svg>
      <View style={[styles.labels, { gap }]}>
        {primary.map((point) => (
          <Text
            key={`l-${point.month}`}
            style={[
              styles.label,
              { width: groupWidth },
              point.month === thisMonth && styles.labelCurrent,
            ]}
          >
            {formatMonthShort(point.month)}
          </Text>
        ))}
      </View>
    </View>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    labels: {
      flexDirection: 'row',
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
  });
}
