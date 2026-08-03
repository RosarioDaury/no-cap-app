import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, typography, spacing } from '@/src/theme/theme';

type ScreenProps = {
  children: React.ReactNode;
  style?: ViewStyle;
  edges?: ('top' | 'bottom')[];
  padded?: boolean;
};

export function Screen({ children, style, edges = ['top'], padded = true }: ScreenProps) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.root,
        {
          paddingTop: edges.includes('top') ? insets.top : 0,
          paddingBottom: edges.includes('bottom') ? insets.bottom : 0,
        },
        padded && styles.padded,
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function Eyebrow({ children, style, color }: { children: React.ReactNode; style?: TextStyle; color?: string }) {
  return <Text style={[styles.eyebrow, color ? { color } : null, style]}>{children}</Text>;
}

export function DisplayTitle({ children, style }: { children: React.ReactNode; style?: TextStyle }) {
  return <Text style={[styles.display, style]}>{children}</Text>;
}

export function SectionTitle({ children, style }: { children: React.ReactNode; style?: TextStyle }) {
  return <Text style={[styles.section, style]}>{children}</Text>;
}

export function BodySm({ children, style }: { children: React.ReactNode; style?: TextStyle }) {
  return <Text style={[styles.bodySm, style]}>{children}</Text>;
}

export function EmptyState({ title, message }: { title: string; message: string }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>{title}</Text>
      <BodySm style={{ textAlign: 'center' }}>{message}</BodySm>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bgApp,
  },
  padded: {
    paddingHorizontal: spacing.xl,
  },
  eyebrow: {
    fontFamily: typography.uiBold,
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.textMuted,
    marginBottom: 4,
  },
  display: {
    fontFamily: typography.display,
    fontSize: 22,
    color: colors.textPrimary,
    letterSpacing: -0.2,
  },
  section: {
    fontFamily: typography.uiBold,
    fontSize: 12.5,
    color: colors.textSecondary,
    letterSpacing: 0.2,
    marginBottom: 10,
  },
  bodySm: {
    fontFamily: typography.ui,
    fontSize: 12.5,
    color: colors.textSecondary,
    lineHeight: 19,
  },
  empty: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: {
    fontFamily: typography.uiSemiBold,
    fontSize: 15,
    color: colors.textPrimary,
  },
});
