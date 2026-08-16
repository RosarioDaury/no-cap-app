import { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { ThemeColors } from '@/src/theme/theme';
import { useTheme } from '@/src/hooks/ThemeProvider';

export function OnboardingProgress({ step, total = 4 }: { step: number; total?: number }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.row}>
      {Array.from({ length: total }, (_, i) => (
        <View key={i} style={[styles.seg, i < step && styles.filled]} />
      ))}
    </View>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      gap: 6,
      marginBottom: 18,
    },
    seg: {
      flex: 1,
      height: 3,
      borderRadius: 2,
      backgroundColor: colors.surfaceAlt,
    },
    filled: {
      backgroundColor: colors.teal[500],
    },
  });
}
