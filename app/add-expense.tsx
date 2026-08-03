import { useMemo, useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { X, Calendar } from 'lucide-react-native';
import {
  Screen,
  Eyebrow,
  SectionTitle,
  Chip,
  ButtonPrimary,
  IconButton,
  Card,
} from '@/src/components';
import { useDb } from '@/src/hooks/DbProvider';
import { formatMoney, parseMoneyInput, todayISO } from '@/src/lib/format';
import { colors, typography } from '@/src/theme/theme';

export default function AddExpenseModal() {
  const router = useRouter();
  const { categories, settings, logExpense } = useDb();
  const currency = settings?.currency ?? 'RD$';
  const [amountRaw, setAmountRaw] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(categories[0]?.id ?? null);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const amountCents = useMemo(() => parseMoneyInput(amountRaw), [amountRaw]);

  const onSubmit = async () => {
    if (!categoryId) {
      setError('Pick a category');
      return;
    }
    if (amountCents <= 0) {
      setError('Enter an amount');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await logExpense({
        categoryId,
        amountCents,
        note,
        date: todayISO(),
      });
      router.back();
    } catch {
      setError('Could not save expense');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen edges={['top', 'bottom']} padded={false}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.topbar}>
          <IconButton onPress={() => router.back()}>
            <X size={16} color={colors.textSecondary} />
          </IconButton>
          <Text style={styles.topTitle}>Log a spend</Text>
          <View style={{ width: 34 }} />
        </View>

        <View style={styles.amountBlock}>
          <Eyebrow style={{ textAlign: 'center' }}>Amount</Eyebrow>
          <TextInput
            value={amountRaw}
            onChangeText={setAmountRaw}
            placeholder={formatMoney(0, currency)}
            placeholderTextColor={colors.textMuted}
            keyboardType="decimal-pad"
            style={styles.amountInput}
          />
        </View>

        <SectionTitle>Category</SectionTitle>
        <View style={styles.chips}>
          {categories.map((c) => (
            <Chip
              key={c.id}
              label={c.name.split(' ')[0]}
              selected={categoryId === c.id}
              onPress={() => setCategoryId(c.id)}
            />
          ))}
        </View>

        <SectionTitle>Note</SectionTitle>
        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="Weekly market run"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
        />

        <SectionTitle>Date</SectionTitle>
        <Card variant="flat" style={styles.dateRow}>
          <Calendar size={15} color={colors.textMuted} />
          <Text style={styles.dateText}>Today</Text>
        </Card>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={{ flex: 1, minHeight: 24 }} />
        <ButtonPrimary label="Log expense" onPress={onSubmit} loading={loading} style={{ marginBottom: 20 }} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
    flexGrow: 1,
  },
  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 18,
  },
  topTitle: {
    fontFamily: typography.uiSemiBold,
    fontSize: 15,
    color: colors.textPrimary,
    letterSpacing: 0.2,
  },
  amountBlock: {
    alignItems: 'center',
    marginVertical: 14,
    marginBottom: 26,
  },
  amountInput: {
    fontFamily: typography.display,
    fontSize: 40,
    color: colors.teal[300],
    textAlign: 'center',
    minWidth: 180,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  input: {
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    color: colors.textPrimary,
    paddingHorizontal: 12,
    fontFamily: typography.ui,
    fontSize: 13,
    marginBottom: 16,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 40,
    paddingVertical: 0,
    paddingHorizontal: 14,
    marginBottom: 24,
  },
  dateText: {
    fontFamily: typography.ui,
    fontSize: 13,
    color: colors.textPrimary,
  },
  error: {
    fontFamily: typography.ui,
    fontSize: 12,
    color: colors.coral[500],
    marginBottom: 8,
  },
});
