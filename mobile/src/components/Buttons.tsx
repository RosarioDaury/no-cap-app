import { useMemo } from 'react';
import { Pressable, Text, StyleSheet, ViewStyle, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Plus, X } from 'lucide-react-native';
import { ThemeColors, radius, typography } from '@/src/theme/theme';
import { useTheme } from '@/src/hooks/ThemeProvider';

const ON_ACCENT = '#04262b';

type ButtonProps = {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  compact?: boolean;
};

export function ButtonPrimary({ label, onPress, disabled, loading, style, compact }: ButtonProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [{ opacity: pressed || disabled ? 0.75 : 1 }, style]}
    >
      <LinearGradient
        colors={[colors.teal[300], colors.teal[700]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.primary, compact && styles.compact, disabled && { opacity: 0.5 }]}
      >
        {loading ? (
          <ActivityIndicator color={ON_ACCENT} />
        ) : (
          <Text style={styles.primaryText}>{label}</Text>
        )}
      </LinearGradient>
    </Pressable>
  );
}

export function ButtonSecondary({ label, onPress, disabled, style, compact }: ButtonProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.secondary,
        compact && styles.compact,
        { opacity: pressed || disabled ? 0.7 : 1 },
        style,
      ]}
    >
      <Text style={styles.secondaryText}>{label}</Text>
    </Pressable>
  );
}

export function ButtonGhost({ label, onPress, disabled, style }: ButtonProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [styles.ghost, { opacity: pressed ? 0.7 : 1 }, style]}
    >
      <Text style={styles.ghostText}>{label}</Text>
    </Pressable>
  );
}

export function QuickAddButton({
  expanded,
  onPress,
}: {
  expanded: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={expanded ? 'Close quick log' : 'Quick log expense'}
      hitSlop={6}
      style={({ pressed }) => [
        styles.quick,
        expanded && styles.quickOpen,
        { opacity: pressed ? 0.75 : 1 },
      ]}
    >
      {expanded ? (
        <X size={15} color={ON_ACCENT} strokeWidth={2.4} />
      ) : (
        <Plus size={16} color={ON_ACCENT} strokeWidth={2.4} />
      )}
    </Pressable>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    primary: {
      height: 48,
      borderRadius: radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
    },
    primaryText: {
      fontFamily: typography.uiBold,
      fontSize: 13,
      letterSpacing: 0.2,
      color: ON_ACCENT,
    },
    secondary: {
      height: 48,
      borderRadius: radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surfaceAlt,
    },
    secondaryText: {
      fontFamily: typography.uiBold,
      fontSize: 13,
      color: colors.textPrimary,
    },
    ghost: {
      height: 48,
      borderRadius: radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
    },
    ghostText: {
      fontFamily: typography.uiSemiBold,
      fontSize: 13,
      color: colors.textSecondary,
    },
    compact: {
      height: 38,
    },
    quick: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.teal[500],
    },
    quickOpen: {
      backgroundColor: colors.teal[300],
    },
  });
}
