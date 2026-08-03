import { Pressable, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors, typography } from '@/src/theme/theme';

export function Chip({
  label,
  selected,
  onPress,
  style,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, selected && styles.active, style]}
    >
      <Text style={[styles.text, selected && styles.activeText]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingVertical: 7,
    paddingHorizontal: 13,
    borderRadius: 20,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  active: {
    backgroundColor: 'rgba(34,211,238,0.12)',
    borderColor: 'rgba(34,211,238,0.4)',
  },
  text: {
    fontFamily: typography.uiSemiBold,
    fontSize: 12,
    color: colors.textSecondary,
  },
  activeText: {
    color: colors.teal[300],
  },
});
