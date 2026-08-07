import { useMemo } from 'react';
import { Pressable, Text, StyleSheet, ViewStyle, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemeColors, radius, typography } from '@/src/theme/theme';
import { useTheme } from '@/src/hooks/ThemeProvider';

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
        colors={[colors.chrome1, colors.chrome2, colors.chrome3]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.primary, compact && styles.compact, disabled && { opacity: 0.5 }]}
      >
        {loading ? (
          <ActivityIndicator color={colors.chromeText} />
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
      style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
    >
      <LinearGradient
        colors={
          expanded
            ? [colors.chromeExpanded1, colors.chromeExpanded2]
            : [colors.chrome1, colors.chrome2, colors.chrome3]
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.metalCircle, expanded && styles.metalCircleActive]}
      >
        <Text style={styles.metalIcon}>{expanded ? '×' : '+'}</Text>
      </LinearGradient>
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
      borderWidth: 1,
      borderColor: colors.chromeBorder,
      shadowColor: colors.teal[500],
      shadowOpacity: 0.25,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 0 },
      elevation: 4,
    },
    primaryText: {
      fontFamily: typography.uiBold,
      fontSize: 13,
      letterSpacing: 0.2,
      color: colors.chromeText,
    },
    secondary: {
      height: 48,
      borderRadius: radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surfaceAlt,
      borderWidth: 1,
      borderColor: colors.border,
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
    metalCircle: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.chromeBorder,
    },
    metalCircleActive: {
      shadowColor: colors.teal[500],
      shadowOpacity: 0.35,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 0 },
    },
    metalIcon: {
      color: colors.chromeText,
      fontSize: 18,
      fontWeight: '600',
      lineHeight: 20,
    },
  });
}
