import { Pressable, Text, StyleSheet, ViewStyle, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, radius, typography } from '@/src/theme/theme';

type ButtonProps = {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  compact?: boolean;
};

export function ButtonPrimary({ label, onPress, disabled, loading, style, compact }: ButtonProps) {
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
          <ActivityIndicator color={colors.teal[300]} />
        ) : (
          <Text style={styles.primaryText}>{label}</Text>
        )}
      </LinearGradient>
    </Pressable>
  );
}

export function ButtonSecondary({ label, onPress, disabled, style, compact }: ButtonProps) {
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
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}>
      <LinearGradient
        colors={
          expanded
            ? ['#2a3138', '#14171a']
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

const styles = StyleSheet.create({
  primary: {
    height: 48,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
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
    color: colors.teal[300],
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
    borderColor: 'rgba(255,255,255,0.12)',
  },
  metalCircleActive: {
    shadowColor: colors.teal[500],
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  metalIcon: {
    color: colors.teal[300],
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 20,
  },
});
