import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '@/src/hooks/ThemeProvider';
import { typography } from '@/src/theme/theme';

type BrandMarkProps = {
  size?: number;
  ink?: string;
  accent?: string;
  /** One-color mark for tab bars and chrome. */
  mono?: boolean;
};

/** Lid-off mark: rising bars out of an open vessel. */
export function BrandMark({ size = 80, ink, accent, mono = false }: BrandMarkProps) {
  const { mode } = useTheme();
  const small = size < 32;
  const resolvedInk = ink ?? (mode === 'light' ? '#161826' : '#e9e9ed');
  const resolvedAccent = mono ? resolvedInk : (accent ?? (mode === 'light' ? '#5d5294' : '#9184d9'));
  const strokeWidth = small ? 10 : 6;

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" accessibilityLabel="NoCap">
      <Path
        d="M24 44v24a14 14 0 0 0 14 14h28a14 14 0 0 0 14-14V44"
        fill="none"
        stroke={resolvedInk}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M38 64V42"
        fill="none"
        stroke={resolvedAccent}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M62 64V22"
        fill="none"
        stroke={resolvedAccent}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

type BrandLockupProps = {
  size?: 'sm' | 'md';
};

/** Horizontal symbol + NoCap wordmark. */
export function BrandLockup({ size = 'md' }: BrandLockupProps) {
  const { colors } = useTheme();
  const mark = size === 'sm' ? 22 : 28;
  const fontSize = size === 'sm' ? 16 : 19;

  return (
    <View style={styles.lockup} accessibilityRole="image" accessibilityLabel="NoCap">
      <BrandMark size={mark} />
      <Text style={[styles.wordmark, { color: colors.textPrimary, fontSize }]}>NoCap</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  lockup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  wordmark: {
    fontFamily: typography.display,
    letterSpacing: -0.2,
  },
});
