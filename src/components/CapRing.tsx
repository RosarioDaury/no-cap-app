import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { View } from 'react-native';
import { TintName } from '@/src/theme/theme';
import { ringColor, ringTrackColor } from '@/src/lib/format';

type CapRingProps = {
  progress: number;
  size?: number;
  strokeWidth?: number;
  tint?: TintName;
  gradient?: boolean;
};

export function CapRing({
  progress,
  size = 34,
  strokeWidth = 4,
  tint = 'teal',
  gradient = false,
}: CapRingProps) {
  const r = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const clamped = Math.min(1, Math.max(0, progress));
  const dashoffset = circumference * (1 - clamped);
  const id = `ring-${tint}-${size}`;

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        {gradient ? (
          <Defs>
            <LinearGradient id={id} x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#7EE8F5" />
              <Stop offset="100%" stopColor="#22D3EE" />
            </LinearGradient>
          </Defs>
        ) : null}
        <Circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={ringTrackColor(tint)}
          strokeWidth={strokeWidth}
        />
        <Circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={gradient ? `url(#${id})` : ringColor(tint)}
          strokeWidth={strokeWidth}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={dashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cy})`}
        />
      </Svg>
    </View>
  );
}
