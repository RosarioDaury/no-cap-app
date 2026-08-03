import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Lightbulb, Plus } from 'lucide-react-native';
import { Screen, Card, ProgressBar, IconButton, EmptyState, BodySm } from '@/src/components';
import { RowIcon } from '@/src/components/ListRow';
import { CategoryIcon, iconBg } from '@/src/components/CategoryIcon';
import { useDb } from '@/src/hooks/DbProvider';
import { formatMoney, formatShortDate } from '@/src/lib/format';
import { colors, typography } from '@/src/theme/theme';

export default function GoalsScreen() {
  const { goals, categories, settings } = useDb();
  const currency = settings?.currency ?? 'RD$';
  const totalCap = categories.reduce((s, c) => s + c.capCents, 0);
  const totalSpent = categories.reduce((s, c) => s + c.spentCents, 0);
  const room = Math.max(0, totalCap - totalSpent);

  return (
    <Screen edges={['top']} padded={false}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.topbar}>
          <Text style={styles.title}>Goals</Text>
          <IconButton>
            <Plus size={16} color={colors.textSecondary} />
          </IconButton>
        </View>

        {goals.length === 0 ? (
          <EmptyState title="No goals yet" message="Add a savings or payoff goal to track progress." />
        ) : (
          <View style={{ gap: 11, flex: 1 }}>
            {goals.map((g) => {
              const progress = g.targetCents > 0 ? g.savedCents / g.targetCents : 0;
              return (
                <Card key={g.id}>
                  <View style={styles.goalHeader}>
                    <RowIcon backgroundColor={iconBg('plum')}>
                      <CategoryIcon name={g.icon} tint="plum" />
                    </RowIcon>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rowTitle}>{g.name}</Text>
                      <Text style={styles.rowSub}>
                        {g.dueDate ? `By ${formatShortDate(g.dueDate)}` : 'No due date'}
                      </Text>
                    </View>
                    <Text style={styles.pct}>{Math.round(progress * 100)}%</Text>
                  </View>
                  <ProgressBar progress={progress} tint="plum" />
                  <Text style={[styles.rowSub, { marginTop: 7 }]}>
                    {formatMoney(g.savedCents, currency)} of {formatMoney(g.targetCents, currency)}
                  </Text>
                </Card>
              );
            })}

            {room > 0 ? (
              <Card variant="flat" style={styles.tip}>
                <Lightbulb size={16} color={colors.plum[700]} />
                <BodySm style={{ color: colors.plum[700], flex: 1 }}>
                  You&apos;re under cap by {formatMoney(room, currency)} — put it toward a goal?
                </BodySm>
              </Card>
            ) : null}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 24,
    flexGrow: 1,
  },
  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 18,
  },
  title: {
    fontFamily: typography.displayMedium,
    fontSize: 19,
    color: colors.textPrimary,
  },
  goalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 9,
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
    marginTop: 1,
  },
  pct: {
    fontFamily: typography.display,
    fontSize: 13,
    color: colors.plum[500],
  },
  tip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
});
