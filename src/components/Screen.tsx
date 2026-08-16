import { useMemo } from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemeColors, typography, spacing, type } from '@/src/theme/theme';
import { useTheme } from '@/src/hooks/ThemeProvider';
import { BrandMark } from '@/src/components/BrandMark';

type ScreenProps = {
  children: React.ReactNode;
  style?: ViewStyle;
  edges?: ('top' | 'bottom')[];
  padded?: boolean;
};

export function Screen({ children, style, edges = ['top'], padded = true }: ScreenProps) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
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

export function Eyebrow({
  children,
  style,
  color,
}: {
  children: React.ReactNode;
  style?: TextStyle;
  color?: string;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return <Text style={[styles.eyebrow, color ? { color } : null, style]}>{children}</Text>;
}

export function DisplayTitle({ children, style }: { children: React.ReactNode; style?: TextStyle }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return <Text style={[styles.display, style]}>{children}</Text>;
}

export function SectionTitle({ children, style }: { children: React.ReactNode; style?: TextStyle }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return <Text style={[styles.section, style]}>{children}</Text>;
}

export function BodySm({ children, style }: { children: React.ReactNode; style?: TextStyle }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return <Text style={[styles.bodySm, style]}>{children}</Text>;
}

export function EmptyState({ title, message }: { title: string; message: string }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.empty}>
      <BrandMark size={36} />
      <Text style={styles.emptyTitle}>{title}</Text>
      <BodySm style={{ textAlign: 'center' }}>{message}</BodySm>
    </View>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.bgApp,
    },
    padded: {
      paddingHorizontal: spacing.xl,
    },
    eyebrow: {
      ...type.eyebrow,
      color: colors.textMuted,
      marginBottom: 4,
    },
    display: {
      ...type.title,
      color: colors.textPrimary,
    },
    section: {
      ...type.meta,
      fontFamily: typography.uiBold,
      color: colors.textSecondary,
      letterSpacing: 0.2,
      marginBottom: 10,
      textTransform: 'uppercase',
    },
    bodySm: {
      ...type.body,
      fontFamily: typography.ui,
      color: colors.textSecondary,
    },
    empty: {
      paddingVertical: 40,
      alignItems: 'center',
      gap: 10,
    },
    emptyTitle: {
      ...type.rowTitle,
      fontSize: 15,
      color: colors.textPrimary,
    },
  });
}
