import { useCallback, useMemo, useState } from 'react';
import { View, Text, Pressable, TextInput, StyleSheet, ScrollView, Alert } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { MessageCircle, WifiOff, Plus } from 'lucide-react-native';
import { Screen, BodySm, DisplayTitle, BrandMark } from '@/src/components';
import { useDb } from '@/src/hooks/DbProvider';
import { useAuth, ApiError } from '@/src/hooks/AuthProvider';
import { useAiAvailability } from '@/src/hooks/useAiAvailability';
import { useTheme } from '@/src/hooks/ThemeProvider';
import { buildInsights } from '@/src/lib/insights';
import { buildSpendSnapshot } from '@/src/lib/spendSnapshot';
import { ChatMessage, getConversation, sendChat } from '@/src/api/client';
import { ThemeColors, TintName, type } from '@/src/theme/theme';

const toneMap: Record<string, TintName> = {
  coral: 'coral',
  teal: 'teal',
  gold: 'gold',
  plum: 'plum',
};

export default function InsightsScreen() {
  const router = useRouter();
  const { categories, settings, history, incomeHistory, goals, debts, bills } = useDb();
  const { token, conversationId, setConversationId, signOut } = useAuth();
  const { colors, tintPalette } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { available, reason } = useAiAvailability();
  const currency = settings?.currency ?? 'RD$';
  const threshold = settings?.capAlertThreshold ?? 80;
  const cards = buildInsights(categories, currency, threshold);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [title, setTitle] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);

  const loadThread = useCallback(async () => {
    if (!token || !conversationId) {
      setMessages([]);
      setTitle(null);
      return;
    }
    try {
      const detail = await getConversation(token, conversationId);
      setMessages(detail.messages);
      setTitle(detail.title);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        await signOut();
        return;
      }
      if (err instanceof ApiError && err.status === 404) {
        await setConversationId(null);
        setMessages([]);
        setTitle(null);
      }
    }
  }, [token, conversationId, setConversationId, signOut]);

  useFocusEffect(
    useCallback(() => {
      void loadThread();
    }, [loadThread]),
  );

  const onSend = async () => {
    const text = draft.trim();
    if (!text || !token || sending) return;
    setSending(true);
    const optimistic: ChatMessage = {
      id: `local_${Date.now()}`,
      role: 'user',
      body: text,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setDraft('');
    try {
      const snapshot = buildSpendSnapshot({
        currency,
        threshold,
        categories,
        history,
        incomeHistory,
        goals,
        debts,
        bills,
      });
      const res = await sendChat(token, {
        conversationId,
        message: text,
        snapshot,
      });
      await setConversationId(res.conversation_id);
      setTitle(res.title);
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== optimistic.id),
        { ...optimistic, id: `${res.message_id}_user` },
        {
          id: res.message_id,
          role: 'assistant',
          body: res.reply,
          created_at: new Date().toISOString(),
        },
      ]);
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      setDraft(text);
      if (err instanceof ApiError && err.status === 401) {
        await signOut();
        Alert.alert('Signed out', 'Sign in again to keep chatting.');
        return;
      }
      Alert.alert('Could not send', err instanceof Error ? err.message : 'Try again.');
    } finally {
      setSending(false);
    }
  };

  const onNewChat = () => {
    void setConversationId(null);
    setMessages([]);
    setTitle(null);
    setDraft('');
  };

  return (
    <Screen edges={['top']} padded={false}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
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

        {title ? <Text style={styles.threadTitle}>{title}</Text> : null}
        {messages.map((m) => (
          <View
            key={m.id}
            style={[styles.bubble, m.role === 'user' ? styles.bubbleUser : styles.bubbleAi]}
          >
            <Text style={styles.bubbleText}>{m.body}</Text>
          </View>
        ))}

        {available ? (
          <View style={styles.composer}>
            <Pressable onPress={onNewChat} hitSlop={8} accessibilityLabel="New chat">
              <Plus size={16} color={colors.textMuted} />
            </Pressable>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="Ask about your spending"
              placeholderTextColor={colors.textMuted}
              style={styles.chatInput}
              editable={!sending}
              onSubmitEditing={() => {
                void onSend();
              }}
              returnKeyType="send"
            />
            <Pressable
              onPress={() => {
                void onSend();
              }}
              disabled={sending || !draft.trim()}
              hitSlop={8}
            >
              <MessageCircle
                size={16}
                color={sending || !draft.trim() ? colors.textMuted : colors.teal[300]}
              />
            </Pressable>
          </View>
        ) : reason === 'signedOut' ? (
          <Pressable
            onPress={() => router.push('/login')}
            style={({ pressed }) => [styles.chatGate, { opacity: pressed ? 0.7 : 1 }]}
          >
            <MessageCircle size={15} color={colors.textMuted} />
            <BodySm style={{ flex: 1, color: colors.textSecondary }}>
              Register or sign in from Settings to unlock AI chat.
            </BodySm>
          </Pressable>
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
    threadTitle: {
      ...type.eyebrow,
      color: colors.textMuted,
      marginTop: 16,
      marginBottom: 8,
    },
    bubble: {
      borderRadius: 14,
      paddingVertical: 10,
      paddingHorizontal: 12,
      marginBottom: 8,
      maxWidth: '92%',
    },
    bubbleUser: {
      alignSelf: 'flex-end',
      backgroundColor: colors.surfaceAlt,
    },
    bubbleAi: {
      alignSelf: 'flex-start',
      backgroundColor: colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    bubbleText: {
      ...type.body,
      color: colors.textPrimary,
    },
    composer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      height: 40,
      paddingHorizontal: 13,
      borderWidth: 0.5,
      borderColor: colors.border,
      borderRadius: 20,
      marginTop: 14,
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
