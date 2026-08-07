import { View, Text, Pressable, TextInput, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Sparkles, MessageCircle, WifiOff } from 'lucide-react-native';
import { Screen, Card, BodySm, DisplayTitle } from '@/src/components';
import { useDb } from '@/src/hooks/DbProvider';
import { useAiAvailability } from '@/src/hooks/useAiAvailability';
import { buildInsights } from '@/src/lib/insights';
import { colors, typography, TintName, tintPalette } from '@/src/theme/theme';

const toneMap: Record<string, TintName> = {
  coral: 'coral',
  teal: 'teal',
  gold: 'gold',
  plum: 'plum',
};

export default function InsightsScreen() {
  const router = useRouter();
  const { categories, settings } = useDb();
  const { available, reason } = useAiAvailability();
  const currency = settings?.currency ?? 'RD$';
  const threshold = settings?.capAlertThreshold ?? 80;
  const cards = buildInsights(categories, currency, threshold);

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
                <Text
                  style={[
                    styles.eyebrow,
                    { color: tintPalette[tint][card.tone === 'teal' ? 700 : 500] },
                  ]}
                >
                  {card.eyebrow}
                </Text>
                <BodySm style={{ color: colors.textPrimary, marginBottom: 8 }}>{card.body}</BodySm>
                <View style={styles.actions}>
                  {card.actions.map((action, index) => (
                    <View key={action.id} style={styles.actionItem}>
                      {index > 0 ? <Text style={styles.actionSep}>·</Text> : null}
                      <Pressable
                        onPress={() => router.push(action.href as never)}
                        hitSlop={8}
                        style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
                      >
                        <BodySm style={styles.actionLabel}>{action.label}</BodySm>
                      </Pressable>
                    </View>
                  ))}
                </View>
              </Card>
            );
          })}
        </View>

        {available ? (
          <View style={styles.chatStub}>
            <MessageCircle size={15} color={colors.textMuted} />
            <TextInput
              editable={false}
              placeholder="Ask about your spending (coming soon)"
              placeholderTextColor={colors.textMuted}
              style={styles.chatInput}
            />
          </View>
        ) : reason === 'offline' ? (
          <View style={styles.chatGate}>
            <WifiOff size={15} color={colors.textMuted} />
            <BodySm style={{ flex: 1, color: colors.textSecondary }}>
              Conversational AI needs an internet connection.
            </BodySm>
          </View>
        ) : (
          <Pressable
            onPress={() => router.push('/(tabs)/settings')}
            style={({ pressed }) => [styles.chatGate, { opacity: pressed ? 0.7 : 1 }]}
          >
            <MessageCircle size={15} color={colors.textMuted} />
            <BodySm style={{ flex: 1, color: colors.textSecondary }}>
              Enable conversational AI in Settings to unlock chat advice.
            </BodySm>
          </Pressable>
        )}
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
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionSep: {
    color: colors.plum[500],
    marginHorizontal: 6,
    fontFamily: typography.uiSemiBold,
    fontSize: 13,
  },
  actionLabel: {
    color: colors.plum[500],
    fontFamily: typography.uiSemiBold,
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
  chatGate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 40,
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: 20,
    marginTop: 14,
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
