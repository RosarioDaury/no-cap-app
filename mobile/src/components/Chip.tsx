import { useMemo } from 'react';
import { Pressable, Text, StyleSheet, View, ViewStyle } from 'react-native';
import { ThemeColors, typography } from '@/src/theme/theme';
import { useTheme } from '@/src/hooks/ThemeProvider';

export function Chip({
  label,
  selected,
  onPress,
  style,
  icon,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
  icon?: React.ReactNode;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <Pressable onPress={onPress} style={[styles.chip, selected && styles.active, style]}>
      {icon ? <View style={styles.icon}>{icon}</View> : null}
      <Text style={[styles.text, selected && styles.activeText]}>{label}</Text>
    </Pressable>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 7,
      paddingHorizontal: 13,
      borderRadius: 20,
      backgroundColor: colors.surfaceAlt,
      borderWidth: 1,
      borderColor: colors.border,
    },
    active: {
      backgroundColor: 'rgba(34,211,238,0.12)',
      borderColor: 'rgba(34,211,238,0.45)',
    },
    icon: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    text: {
      fontFamily: typography.uiSemiBold,
      fontSize: 12,
      color: colors.textSecondary,
    },
    activeText: {
      color: colors.teal[300],
    },
  });
}
