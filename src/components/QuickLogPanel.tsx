import { View, Text, TextInput, StyleSheet } from 'react-native';
import { useState } from 'react';
import { colors, radius, typography } from '@/src/theme/theme';
import { ButtonPrimary, ButtonSecondary } from '@/src/components/Buttons';
import { parseMoneyInput } from '@/src/lib/format';

type QuickLogPanelProps = {
  categoryName: string;
  currencySymbol?: string;
  onSubmit: (amountCents: number, note?: string) => Promise<void> | void;
  onCancel: () => void;
};

export function QuickLogPanel({
  categoryName,
  currencySymbol = 'RD$',
  onSubmit,
  onCancel,
}: QuickLogPanelProps) {
  const [raw, setRaw] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

const styles = StyleSheet.create({
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
    color: colors.teal[300],
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
});
