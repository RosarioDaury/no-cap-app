import { useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import {
  Screen,
  DisplayTitle,
  BodySm,
  Card,
  ButtonPrimary,
  IconButton,
  EmptyState,
  SectionTitle,
} from '@/src/components';
import { useDb } from '@/src/hooks/DbProvider';
import { formatMoney, formatShortDate, parseMoneyInput } from '@/src/lib/format';
import { colors, typography } from '@/src/theme/theme';

export default function IncomeScreen() {
  const router = useRouter();
  const { incomeTransactions, settings, logIncome } = useDb();
  const currency = settings?.currency ?? 'RD$';
  const [raw, setRaw] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const total = incomeTransactions.reduce((s, t) => s + t.amountCents, 0);

  return (
    <Screen edges={['top']} padded={false}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.topbar}>
          <IconButton onPress={() => router.back()}>
            <ArrowLeft size={16} color={colors.textSecondary} />
          </IconButton>
          <DisplayTitle style={{ fontSize: 17 }}>Income</DisplayTitle>
          <View style={{ width: 34 }} />
        </View>

        <Card variant="tint" tint="teal" style={{ marginBottom: 18 }}>
          <Text style={styles.label}>This month</Text>
          <Text style={styles.total}>{formatMoney(total, currency)}</Text>
          <BodySm>Tracked separately from your expense caps.</BodySm>
        </Card>

        <SectionTitle>Log income</SectionTitle>
        <TextInput
          value={raw}
          onChangeText={setRaw}
          placeholder={`${currency}0`}
          placeholderTextColor={colors.textMuted}
          keyboardType="decimal-pad"
          style={styles.input}
        />
        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="Paycheck, freelance…"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
        />
        <ButtonPrimary
          label="Add income"
          loading={loading}
          style={{ marginBottom: 20 }}
          onPress={async () => {
            const cents = parseMoneyInput(raw);
            if (cents <= 0) return;
            setLoading(true);
            try {
              await logIncome({ amountCents: cents, note });
              setRaw('');
              setNote('');
            } finally {
              setLoading(false);
            }
          }}
        />

        <SectionTitle>Recent income</SectionTitle>
        {incomeTransactions.length === 0 ? (
          <EmptyState title="No income logged" message="Add a paycheck or other inflow above." />
        ) : (
          incomeTransactions.map((t, i) => (
            <View
              key={t.id}
              style={[styles.row, i === incomeTransactions.length - 1 && { borderBottomWidth: 0 }]}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{t.note || 'Income'}</Text>
                <Text style={styles.rowSub}>{formatShortDate(t.date)}</Text>
              </View>
              <Text style={styles.value}>{formatMoney(t.amountCents, currency)}</Text>
            </View>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 32 },
  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  label: {
    fontFamily: typography.uiBold,
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.teal[300],
    marginBottom: 4,
  },
  total: {
    fontFamily: typography.display,
    fontSize: 28,
    color: colors.teal[300],
    marginBottom: 4,
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
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowTitle: {
    fontFamily: typography.uiSemiBold,
    fontSize: 13,
    color: colors.textPrimary,
  },
  rowSub: {
    fontFamily: typography.ui,
    fontSize: 11,
    color: colors.textMuted,
  },
  value: {
    fontFamily: typography.display,
    fontSize: 13,
    color: colors.teal[300],
  },
});
