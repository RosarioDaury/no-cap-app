import { useMemo } from 'react';
import { Pressable, View, Text, StyleSheet } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { ThemeColors, typography } from '@/src/theme/theme';
import { useTheme } from '@/src/hooks/ThemeProvider';

type ListRowProps = {
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  value?: string;
  onPress?: () => void;
  showChevron?: boolean;
  last?: boolean;
};

export function ListRow({
  icon,
  title,
  subtitle,
  value,
  onPress,
  showChevron = true,
  last,
}: ListRowProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const content = (
    <View style={[styles.row, last && styles.last]}>
      {icon}
      <View style={styles.main}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.sub}>{subtitle}</Text> : null}
      </View>
      {value ? <Text style={styles.value}>{value}</Text> : null}
      {showChevron && onPress ? <ChevronRight size={14} color={colors.textMuted} /> : null}
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}>
        {content}
      </Pressable>
    );
  }
  return content;
}

export function RowIcon({
  children,
  backgroundColor,
}: {
  children: React.ReactNode;
  backgroundColor?: string;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        width: 34,
        height: 34,
        borderRadius: 11,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: backgroundColor ?? colors.surfaceAlt,
      }}
    >
      {children}
    </View>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 11,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    last: {
      borderBottomWidth: 0,
    },
    main: {
      flex: 1,
      gap: 2,
    },
    title: {
      fontFamily: typography.uiSemiBold,
      fontSize: 13,
      color: colors.textPrimary,
    },
    sub: {
      fontFamily: typography.ui,
      fontSize: 11,
      color: colors.textMuted,
    },
    value: {
      fontFamily: typography.uiMedium,
      fontSize: 12,
      color: colors.textSecondary,
      marginRight: 4,
    },
  });
}
