import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import {
  Screen,
  DisplayTitle,
  BodySm,
  Card,
  ProgressBar,
  IconButton,
  EmptyState,
} from '@/src/components';
import { useDb } from '@/src/hooks/DbProvider';
import { formatMoney, formatShortDate } from '@/src/lib/format';
import { colors, typography } from '@/src/theme/theme';

export default function DebtScreen() {
  const router = useRouter();
  const { debts, settings } = useDb();
  const currency = settings?.currency ?? 'RD$';

  return (
    <Screen edges={['top']} padded={false}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.topbar}>
          <IconButton onPress={() => router.back()}>
            <ArrowLeft size={16} color={colors.textSecondary} />
          </IconButton>
          <DisplayTitle style={{ fontSize: 17 }}>Debt tracker</DisplayTitle>
          <View style={{ width: 34 }} />
        </View>

        {debts.length === 0 ? (
          <EmptyState title="No debts tracked" message="Add a balance and monthly payment to see payoff pace." />
        ) : (
          <View style={{ gap: 11 }}>
            {debts.map((d) => {
              const months = d.paymentCents > 0 ? Math.ceil(d.balanceCents / d.paymentCents) : 0;
              // progress as remaining vs a notional original — use payment plan completion proxy
              const paidProxy = months > 0 ? Math.min(0.95, 1 / months) : 0;
              return (
                <Card key={d.id} variant="tint" tint="plum">
                  <Text style={styles.name}>{d.name}</Text>
                  <Text style={styles.balance}>{formatMoney(d.balanceCents, currency)}</Text>
                  <BodySm style={{ marginBottom: 10 }}>
                    {formatMoney(d.paymentCents, currency)}/mo
                    {d.dueDate ? ` · due ${formatShortDate(d.dueDate)}` : ''}
                    {months ? ` · ~${months} months` : ''}
                  </BodySm>
                  <ProgressBar progress={1 - paidProxy} tint="plum" />
                </Card>
              );
            })}
          </View>
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
  name: {
    fontFamily: typography.uiSemiBold,
    fontSize: 13,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  balance: {
    fontFamily: typography.display,
    fontSize: 22,
    color: colors.plum[300],
    marginBottom: 4,
  },
});
