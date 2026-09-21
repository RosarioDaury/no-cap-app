import { useMemo } from 'react';
import { Pressable, View, StyleSheet } from 'react-native';
import { Settings } from 'lucide-react-native';
import { ThemeColors, TintName } from '@/src/theme/theme';
import { useTheme } from '@/src/hooks/ThemeProvider';

export function ProgressBar({
  progress,
  tint = 'plum',
}: {
  progress: number;
  tint?: TintName;
}) {
  const { colors, tintPalette } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const width = `${Math.min(100, Math.max(0, progress * 100))}%`;
  return (
    <View style={styles.track}>
      <View
        style={[
          styles.fill,
          { width: width as `${number}%`, backgroundColor: tintPalette[tint][500] },
        ]}
      />
    </View>
  );
}

export function HeaderGear({ onPress }: { onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <IconButton onPress={onPress} accessibilityLabel="Settings">
      <Settings size={16} color={colors.textSecondary} />
    </IconButton>
  );
}

export function IconButton({
  onPress,
  children,
  accessibilityLabel,
}: {
  onPress?: () => void;
  children: React.ReactNode;
  accessibilityLabel?: string;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [styles.iconBtn, { opacity: pressed ? 0.7 : 1 }]}
    >
      {children}
    </Pressable>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    track: {
      height: 5,
      backgroundColor: colors.border,
      borderRadius: 4,
      overflow: 'hidden',
    },
    fill: {
      height: '100%',
      borderRadius: 4,
    },
    iconBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surfaceAlt,
    },
  });
}
