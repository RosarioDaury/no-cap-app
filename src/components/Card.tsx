import { useMemo } from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemeColors, TintName, radius } from '@/src/theme/theme';
import { useTheme } from '@/src/hooks/ThemeProvider';

type CardProps = {
  children: React.ReactNode;
  variant?: 'default' | 'flat' | 'tint';
  tint?: TintName;
  style?: StyleProp<ViewStyle>;
};

const tintBorder: Record<TintName, string> = {
  teal: 'rgba(34,211,238,0.25)',
  gold: 'rgba(245,166,35,0.25)',
  plum: 'rgba(139,92,246,0.25)',
  coral: 'rgba(251,68,99,0.25)',
};

export function Card({ children, variant = 'default', tint = 'teal', style }: CardProps) {
  const { colors, tintPalette } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  if (variant === 'flat') {
    return <View style={[styles.flat, style]}>{children}</View>;
  }

  if (variant === 'tint') {
    return (
      <LinearGradient
        colors={[tintPalette[tint][50], colors.surface]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.9 }}
        style={[styles.card, { borderColor: tintBorder[tint] }, style]}
      >
        {children}
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={[colors.surface, colors.surfaceAlt]}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={[styles.card, style]}
    >
      {children}
    </LinearGradient>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    card: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.md,
      paddingVertical: 15,
      paddingHorizontal: 16,
    },
    flat: {
      backgroundColor: colors.surfaceAlt,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.md,
      paddingVertical: 14,
      paddingHorizontal: 15,
    },
  });
}
