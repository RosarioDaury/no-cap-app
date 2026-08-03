import { View, Text, TextInput, StyleSheet, ScrollView } from 'react-native';
import { Sparkles, MessageCircle } from 'lucide-react-native';
import { Screen, Card, BodySm, DisplayTitle } from '@/src/components';
import { useDb } from '@/src/hooks/DbProvider';
import { buildInsights } from '@/src/lib/insights';
import { colors, typography, TintName, tintPalette } from '@/src/theme/theme';

const toneMap: Record<string, TintName> = {
  coral: 'coral',
  teal: 'teal',
  gold: 'gold',
  plum: 'plum',
};

export default function InsightsScreen() {
  const { categories, debts, settings } = useDb();
  const currency = settings?.currency ?? 'RD$';
  const cards = buildInsights(categories, debts, currency);

  return (
    <Screen edges={['top']} padded={false}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Sparkles size={16} color={colors.gold[700]} />
          <DisplayTitle style={{ fontSize: 19 }}>Insights</DisplayTitle>
        </View>

        <View style={{ gap: 10, flex: 1 }}>
          {cards.map((card) => {
            const tint = toneMap[card.tone];
            return (
              <Card
                key={card.id}
                style={{
                  borderLeftWidth: 2.5,
                  borderLeftColor: tintPalette[tint][500],
                  borderTopLeftRadius: 0,
                  borderBottomLeftRadius: 0,
                }}
              >
                <Text style={[styles.eyebrow, { color: tintPalette[tint][card.tone === 'teal' ? 700 : 500] }]}>
                  {card.eyebrow}
                </Text>
                <BodySm style={{ color: colors.textPrimary, marginBottom: 6 }}>{card.body}</BodySm>
                <BodySm style={{ color: colors.plum[500], fontFamily: typography.uiSemiBold }}>
                  {card.action}
                </BodySm>
              </Card>
            );
          })}
        </View>

        <View style={styles.chatStub}>
          <MessageCircle size={15} color={colors.textMuted} />
          <TextInput
            editable={false}
            placeholder="Ask about your spending (coming soon)"
            placeholderTextColor={colors.textMuted}
            style={styles.chatInput}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 16,
  },
  eyebrow: {
    fontFamily: typography.uiBold,
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  chatStub: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 40,
    paddingHorizontal: 13,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: 20,
    marginTop: 14,
    opacity: 0.7,
  },
  chatInput: {
    flex: 1,
    height: '100%',
    color: colors.textPrimary,
    fontFamily: typography.ui,
    fontSize: 13,
    padding: 0,
  },
});
