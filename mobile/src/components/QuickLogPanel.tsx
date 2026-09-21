import { useMemo, useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { ThemeColors, ThemeMode, radius, typography } from '@/src/theme/theme';
import { useTheme } from '@/src/hooks/ThemeProvider';
import { ButtonPrimary, ButtonSecondary } from '@/src/components/Buttons';
import { formatMoney, parseMoneyInput } from '@/src/lib/format';
import { type } from '@/src/theme/theme';

type QuickLogPanelProps = {
  categoryName: string;
  currencySymbol?: string;
  remainingCapCents?: number;
  onSubmit: (amountCents: number, note?: string) => Promise<void> | void;
  onCancel: () => void;
};

export function QuickLogPanel({
  categoryName,
  currencySymbol = 'RD$',
  remainingCapCents,
  onSubmit,
  onCancel,
}: QuickLogPanelProps) {
  const { colors, mode } = useTheme();
  const styles = useMemo(() => makeStyles(colors, mode), [colors, mode]);
  const [raw, setRaw] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const draftCents = parseMoneyInput(raw);
  const leftover =
    remainingCapCents == null ? null : remainingCapCents - draftCents;

  const handleSubmit = async () => {
    const cents = parseMoneyInput(raw);
    if (cents <= 0) {
      setError('Enter an amount');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await onSubmit(cents, note.trim() || undefined);
      setRaw('');
      setNote('');
    } catch {
      setError('Could not save. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.panel}>
      <TextInput
        value={raw}
        onChangeText={(t) => {
          setRaw(t);
          setError(null);
        }}
        placeholder={`${currencySymbol}0`}
        placeholderTextColor={colors.textMuted}
        keyboardType="decimal-pad"
        style={styles.amount}
        autoFocus
        accessibilityLabel={`Amount for ${categoryName}`}
      />
      <TextInput
        value={note}
        onChangeText={setNote}
        placeholder="Note (optional)"
        placeholderTextColor={colors.textMuted}
        style={styles.note}
        accessibilityLabel="Expense note"
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {leftover != null ? (
        <Text style={[styles.footer, leftover < 0 && styles.footerOver]}>
          {leftover < 0
            ? `Puts ${categoryName} ${formatMoney(Math.abs(leftover), currencySymbol)} over`
            : `Leaves ${formatMoney(leftover, currencySymbol)} in ${categoryName} this month`}
        </Text>
      ) : null}
      <View style={styles.actions}>
        <ButtonSecondary label="Cancel" onPress={onCancel} compact style={{ flex: 1 }} />
        <ButtonPrimary
          label={`Log to ${categoryName.split(' ')[0]}`}
          onPress={handleSubmit}
          loading={loading}
          compact
          style={{ flex: 1.4 }}
        />
      </View>
    </View>
  );
}

function makeStyles(colors: ThemeColors, mode: ThemeMode) {
  return StyleSheet.create({
    panel: {
      backgroundColor: colors.surfaceAlt,
      borderWidth: 1,
      borderColor: 'rgba(34,211,238,0.3)',
      borderRadius: radius.md,
      paddingVertical: 12,
      paddingHorizontal: 13,
      marginTop: 8,
      shadowColor: colors.teal[500],
      shadowOpacity: 0.2,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 0 },
    },
    amount: {
      fontFamily: typography.display,
      fontSize: 22,
      color: mode === 'light' ? colors.teal[700] : colors.teal[300],
      marginBottom: 8,
      padding: 0,
    },
    note: {
      fontFamily: typography.ui,
      fontSize: 13,
      color: colors.textPrimary,
      marginBottom: 10,
      paddingVertical: 6,
      paddingHorizontal: 0,
    },
    actions: {
      flexDirection: 'row',
      gap: 8,
    },
    error: {
      fontFamily: typography.ui,
      fontSize: 12,
      color: colors.coral[500],
      marginBottom: 8,
    },
    footer: {
      ...type.meta,
      color: colors.textMuted,
      textAlign: 'center',
      marginBottom: 10,
    },
    footerOver: {
      color: colors.coral[500],
    },
  });
}
