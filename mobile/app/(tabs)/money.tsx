import { useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, DisplayTitle, HeaderGear } from '@/src/components';
import { IncomePane } from '@/src/screens/IncomePane';
import { DebtPane } from '@/src/screens/DebtPane';
import { TrendsPane } from '@/src/screens/TrendsPane';
import { useTheme } from '@/src/hooks/ThemeProvider';
import { ThemeColors, type } from '@/src/theme/theme';

type Pane = 'income' | 'debt' | 'trends';

const SEGMENTS: { id: Pane; label: string }[] = [
  { id: 'income', label: 'Income' },
  { id: 'debt', label: 'Debt' },
  { id: 'trends', label: 'Trends' },
];

export default function MoneyScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [pane, setPane] = useState<Pane>('income');

  return (
    <Screen edges={['top']} padded={false}>
      <View style={styles.header}>
        <DisplayTitle style={{ fontSize: 19 }}>Money</DisplayTitle>
        <HeaderGear onPress={() => router.push('/(tabs)/settings')} />
      </View>
      <View style={styles.segments}>
        {SEGMENTS.map((s) => {
          const active = pane === s.id;
          return (
            <Pressable
              key={s.id}
              onPress={() => setPane(s.id)}
              style={[styles.seg, active && styles.segActive]}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <Text style={[styles.segLabel, active && styles.segLabelActive]}>{s.label}</Text>
            </Pressable>
          );
        })}
      </View>
      {pane === 'income' ? <IncomePane /> : null}
      {pane === 'debt' ? <DebtPane /> : null}
      {pane === 'trends' ? <TrendsPane /> : null}
    </Screen>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingTop: 8,
      marginBottom: 12,
    },
    segments: {
      flexDirection: 'row',
      marginHorizontal: 20,
      marginBottom: 8,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      padding: 3,
    },
    seg: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 8,
      borderRadius: 9,
    },
    segActive: {
      backgroundColor: colors.surfaceAlt,
    },
    segLabel: {
      ...type.rowTitle,
      fontSize: 12,
      color: colors.textMuted,
    },
    segLabelActive: {
      color: colors.textPrimary,
    },
  });
}
