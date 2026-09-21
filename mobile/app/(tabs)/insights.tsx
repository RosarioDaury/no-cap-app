import { useMemo } from 'react';
import { View, Text, Pressable, TextInput, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { MessageCircle, WifiOff } from 'lucide-react-native';
import { Screen, BodySm, DisplayTitle, BrandMark } from '@/src/components';
import { useDb } from '@/src/hooks/DbProvider';
import { useAiAvailability } from '@/src/hooks/useAiAvailability';
import { useTheme } from '@/src/hooks/ThemeProvider';
import { buildInsights } from '@/src/lib/insights';
import { ThemeColors, TintName, type } from '@/src/theme/theme';

const toneMap: Record<string, TintName> = {
  coral: 'coral',
  teal: 'teal',
  gold: 'gold',
  plum: 'plum',
};

export default function InsightsScreen() {
  const router = useRouter();
  const { categories, settings } = useDb();
  const { colors, tintPalette } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { available, reason } = useAiAvailability();
  const currency = settings?.currency ?? 'RD$';
  const threshold = settings?.capAlertThreshold ?? 80;
  const cards = buildInsights(categories, currency, threshold);

  return (
    <Screen edges={['top']} padded={false}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <BrandMark size={22} />
          <DisplayTitle style={{ fontSize: 19 }}>Insights</DisplayTitle>
        </View>

        <View>
          {cards.map((card) => {
            const tint = toneMap[card.tone];
            return (
              <View key={card.id} style={styles.block}>
                <Text style={[styles.eyebrow, { color: tintPalette[tint][500] }]}>
                  {card.eyebrow}
                </Text>
                <BodySm style={{ color: colors.textSecondary, marginBottom: 10 }}>
                  {card.body}
                </BodySm>
                <View style={styles.actions}>
                  {card.actions.map((action) => (
                    <Pressable
                      key={action.id}
                      onPress={() => router.push(action.href as never)}
                      hitSlop={8}
                      style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
                    >
                      <Text style={styles.actionLabel}>{action.label}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
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

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
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
      marginBottom: 8,
    },
    block: {
      paddingVertical: 14,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    eyebrow: {
      ...type.eyebrow,
      marginBottom: 6,
    },
    actions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 16,
    },
    actionLabel: {
      ...type.body,
      color: colors.textPrimary,
      borderBottomWidth: 1,
      borderBottomColor: colors.textPrimary,
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
      fontFamily: type.body.fontFamily,
      fontSize: 13,
      padding: 0,
    },
  });
}
