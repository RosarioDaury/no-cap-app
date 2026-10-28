import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  TextInput,
  StyleSheet,
  ScrollView,
  Alert,
  Animated,
  useWindowDimensions,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import {
  MessageCircle,
  WifiOff,
  Plus,
  Pencil,
  Trash2,
  Send,
  PanelLeft,
  PanelLeftClose,
} from 'lucide-react-native';
import {
  Screen,
  BodySm,
  DisplayTitle,
  KeyboardSheet,
  IconButton,
} from '@/src/components';
import { ButtonPrimary, ButtonSecondary } from '@/src/components/Buttons';
import { useDb } from '@/src/hooks/DbProvider';
import { useAuth, ApiError } from '@/src/hooks/AuthProvider';
import { useAiAvailability } from '@/src/hooks/useAiAvailability';
import { useTheme } from '@/src/hooks/ThemeProvider';
import { buildInsights } from '@/src/lib/insights';
import { buildSpendSnapshot } from '@/src/lib/spendSnapshot';
import {
  ChatMessage,
  ConversationSummary,
  deleteConversation,
  getConversation,
  listConversations,
  renameConversation,
  sendChat,
} from '@/src/api/client';
import { ThemeColors, TintName, radius, type, typography } from '@/src/theme/theme';

const SIDEBAR_WIDTH = 288;

const toneMap: Record<string, TintName> = {
  coral: 'coral',
  teal: 'teal',
  gold: 'gold',
  plum: 'plum',
};

function isErrorReply(message: ChatMessage) {
  if (message.error) return true;
  const body = message.body;
  return (
    body.includes('AI is not configured yet') ||
    body.includes('The AI provider failed') ||
    body.includes('Cannot reach the NoCap API') ||
    body.includes('no API credits') ||
    body.includes('OpenAI key is valid')
  );
}

export default function InsightsScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const docked = width >= 768;
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
  const [chats, setChats] = useState<ConversationSummary[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(width >= 768);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');
  const [renaming, setRenaming] = useState(false);
  const [headerHeight, setHeaderHeight] = useState(53);
  const slide = useRef(new Animated.Value(width >= 768 ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(slide, {
      toValue: sidebarOpen ? 1 : 0,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [sidebarOpen, slide]);

  const refreshChats = useCallback(async () => {
    if (!token) {
      setChats([]);
      return;
    }
    try {
      setChats(await listConversations(token));
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        await signOut();
      }
    }
  }, [token, signOut]);

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
      void refreshChats();
    }, [loadThread, refreshChats]),
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
          error: !!res.error,
        },
      ]);
      await refreshChats();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        await signOut();
        Alert.alert('Signed out', 'Sign in again to keep chatting.');
        setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
        setDraft(text);
        return;
      }
      const message = err instanceof Error ? err.message : 'Try again.';
      setMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          role: 'assistant',
          body: message,
          created_at: new Date().toISOString(),
          error: true,
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  const closeDrawerIfOverlay = () => {
    if (!docked) setSidebarOpen(false);
  };

  const onNewChat = () => {
    void setConversationId(null);
    setMessages([]);
    setTitle(null);
    setDraft('');
    closeDrawerIfOverlay();
  };

  const onOpenChat = (id: string) => {
    void setConversationId(id);
    closeDrawerIfOverlay();
  };

  const openRename = (id: string, current: string) => {
    setRenameId(id);
    setRenameDraft(current);
    setRenameOpen(true);
  };

  const onSaveRename = async () => {
    const next = renameDraft.trim();
    if (!token || !renameId || !next) {
      Alert.alert('Name required', 'Give this chat a name.');
      return;
    }
    setRenaming(true);
    try {
      const updated = await renameConversation(token, renameId, next);
      if (renameId === conversationId) setTitle(updated.title);
      setChats((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      setRenameOpen(false);
    } catch (err) {
      Alert.alert('Could not rename', err instanceof Error ? err.message : 'Try again.');
    } finally {
      setRenaming(false);
    }
  };

  const onDeleteChat = (id: string, name: string) => {
    if (!token) return;
    Alert.alert('Delete chat?', `"${name}" will be removed from the server.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              await deleteConversation(token, id);
              if (id === conversationId) {
                await setConversationId(null);
                setMessages([]);
                setTitle(null);
              }
              await refreshChats();
            } catch (err) {
              Alert.alert('Could not delete', err instanceof Error ? err.message : 'Try again.');
            }
          })();
        },
      },
    ]);
  };

  const chatList = (
    <View style={styles.sidebarInner}>
      <View style={styles.sidebarHead}>
        <Text style={styles.eyebrow}>Chats</Text>
        <Pressable
          onPress={onNewChat}
          accessibilityRole="button"
          accessibilityLabel="New chat"
          style={({ pressed }) => [styles.btnNew, { opacity: pressed ? 0.8 : 1 }]}
        >
          <Plus size={14} color="#04262b" />
          <Text style={styles.btnNewLabel}>New chat</Text>
        </Pressable>
      </View>
      <ScrollView
        style={styles.sidebarScroll}
        contentContainerStyle={styles.sidebarScrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {chats.length === 0 ? (
          <BodySm style={{ color: colors.textMuted }}>
            No saved chats yet. Send a message and it will show up here.
          </BodySm>
        ) : (
          chats.map((chat) => {
            const active = chat.id === conversationId;
            return (
              <View key={chat.id} style={[styles.chatRow, active && styles.chatRowActive]}>
                <Pressable
                  onPress={() => onOpenChat(chat.id)}
                  style={styles.chatMain}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                >
                  <Text
                    style={[styles.chatTitle, active && styles.chatTitleActive]}
                    numberOfLines={1}
                  >
                    {chat.title}
                  </Text>
                  <Text style={styles.chatMeta}>
                    {chat.message_count} message{chat.message_count === 1 ? '' : 's'}
                  </Text>
                </Pressable>
                <IconButton
                  onPress={() => openRename(chat.id, chat.title)}
                  accessibilityLabel={`Rename ${chat.title}`}
                >
                  <Pencil size={14} color={colors.textSecondary} />
                </IconButton>
                <IconButton
                  onPress={() => onDeleteChat(chat.id, chat.title)}
                  accessibilityLabel={`Delete ${chat.title}`}
                >
                  <Trash2 size={14} color={colors.coral[500]} />
                </IconButton>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );

  const overlayTranslate = slide.interpolate({
    inputRange: [0, 1],
    outputRange: [-SIDEBAR_WIDTH, 0],
  });
  const backdropOpacity = slide.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.45],
  });

  return (
    <Screen edges={['top']} padded={false}>
      <View style={styles.shell}>
        <View
          style={styles.header}
          onLayout={(event) => setHeaderHeight(event.nativeEvent.layout.height)}
        >
          {available ? (
            <IconButton
              onPress={() => setSidebarOpen((open) => !open)}
              accessibilityLabel={sidebarOpen ? 'Hide chats' : 'Show chats'}
            >
              {sidebarOpen ? (
                <PanelLeftClose size={16} color={colors.textSecondary} />
              ) : (
                <PanelLeft size={16} color={colors.textSecondary} />
              )}
            </IconButton>
          ) : null}
          <Text style={styles.headerTitle} numberOfLines={1}>
            {title ?? 'Insights'}
          </Text>
          {available ? (
            <Pressable
              onPress={onNewChat}
              accessibilityRole="button"
              accessibilityLabel="New chat"
              style={({ pressed }) => [styles.btnNew, { opacity: pressed ? 0.8 : 1 }]}
            >
              <Plus size={14} color="#04262b" />
              <Text style={styles.btnNewLabel}>New</Text>
            </Pressable>
          ) : null}
        </View>

        <View style={styles.body}>
          {available && docked ? (
            <View style={[styles.sidebarDock, !sidebarOpen && styles.sidebarDockCollapsed]}>
              {sidebarOpen ? chatList : null}
            </View>
          ) : null}

          <KeyboardAvoidingView style={styles.main} behavior="padding">
            <ScrollView
              style={styles.threadScroll}
              contentContainerStyle={styles.threadContent}
              keyboardShouldPersistTaps="handled"
            >
              {cards.length > 0 ? (
                <View style={styles.alerts}>
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
              ) : null}

              {messages.length === 0 && available ? (
                <View style={styles.emptyThread}>
                  <Text style={styles.emptyTitle}>Ask NoCap</Text>
                  <BodySm style={{ color: colors.textMuted, textAlign: 'center' }}>
                    Ask about this month’s spend, caps, bills, or leftover room.
                  </BodySm>
                </View>
              ) : null}

              {messages.map((m) => {
                const err = isErrorReply(m);
                return (
                  <View
                    key={m.id}
                    style={[
                      styles.bubble,
                      m.role === 'user' ? styles.bubbleUser : styles.bubbleAi,
                      err && styles.bubbleError,
                    ]}
                  >
                    <Text style={[styles.bubbleText, err && styles.bubbleErrorText]}>{m.body}</Text>
                  </View>
                );
              })}
            </ScrollView>

            {available ? (
              <View style={styles.composerWrap}>
                <View style={styles.composer}>
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
                    accessibilityRole="button"
                    accessibilityLabel="Send"
                    style={({ pressed }) => [
                      styles.btnSend,
                      (sending || !draft.trim()) && styles.btnSendDisabled,
                      { opacity: pressed ? 0.8 : 1 },
                    ]}
                  >
                    <Send
                      size={14}
                      color={sending || !draft.trim() ? colors.textMuted : '#04262b'}
                    />
                    <Text
                      style={[
                        styles.btnSendLabel,
                        (sending || !draft.trim()) && { color: colors.textMuted },
                      ]}
                    >
                      {sending ? 'Sending' : 'Send'}
                    </Text>
                  </Pressable>
                </View>
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
          </KeyboardAvoidingView>
        </View>

        {available && !docked ? (
          <>
            <Animated.View
              pointerEvents={sidebarOpen ? 'auto' : 'none'}
              style={[styles.backdrop, { top: headerHeight, opacity: backdropOpacity }]}
            >
              <Pressable style={StyleSheet.absoluteFill} onPress={() => setSidebarOpen(false)} />
            </Animated.View>
            <Animated.View
              style={[
                styles.drawer,
                { top: headerHeight, transform: [{ translateX: overlayTranslate }] },
              ]}
              pointerEvents={sidebarOpen ? 'auto' : 'none'}
            >
              {chatList}
            </Animated.View>
          </>
        ) : null}
      </View>

      <KeyboardSheet visible={renameOpen} onRequestClose={() => setRenameOpen(false)}>
        <DisplayTitle style={{ fontSize: 18, marginBottom: 12 }}>Rename chat</DisplayTitle>
        <TextInput
          value={renameDraft}
          onChangeText={setRenameDraft}
          placeholder="Chat name"
          placeholderTextColor={colors.textMuted}
          autoFocus
          style={styles.renameInput}
        />
        <View style={styles.renameActions}>
          <ButtonSecondary label="Cancel" style={{ flex: 1 }} onPress={() => setRenameOpen(false)} />
          <ButtonPrimary
            label="Save"
            loading={renaming}
            style={{ flex: 1 }}
            onPress={() => {
              void onSaveRename();
            }}
          />
        </View>
      </KeyboardSheet>
    </Screen>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    shell: {
      flex: 1,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    headerTitle: {
      flex: 1,
      fontFamily: typography.display,
      fontSize: 18,
      letterSpacing: -0.4,
      color: colors.textPrimary,
    },
    body: {
      flex: 1,
      flexDirection: 'row',
    },
    sidebarDock: {
      width: SIDEBAR_WIDTH,
      borderRightWidth: StyleSheet.hairlineWidth,
      borderRightColor: colors.border,
      backgroundColor: colors.surface,
    },
    sidebarDockCollapsed: {
      width: 0,
      borderRightWidth: 0,
      overflow: 'hidden',
    },
    sidebarInner: {
      flex: 1,
      width: SIDEBAR_WIDTH,
    },
    sidebarHead: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 14,
      paddingTop: 14,
      paddingBottom: 10,
    },
    sidebarScroll: {
      flex: 1,
    },
    sidebarScrollContent: {
      paddingHorizontal: 12,
      paddingBottom: 16,
      gap: 8,
    },
    drawer: {
      position: 'absolute',
      top: 0,
      bottom: 0,
      left: 0,
      width: SIDEBAR_WIDTH,
      backgroundColor: colors.surface,
      borderRightWidth: 1,
      borderRightColor: colors.border,
      zIndex: 20,
    },
    backdrop: {
      position: 'absolute',
      right: 0,
      bottom: 0,
      left: 0,
      backgroundColor: '#000',
      zIndex: 15,
    },
    main: {
      flex: 1,
    },
    threadScroll: {
      flex: 1,
    },
    threadContent: {
      paddingHorizontal: 20,
      paddingTop: 8,
      paddingBottom: 16,
      flexGrow: 1,
    },
    eyebrow: {
      ...type.eyebrow,
      marginBottom: 4,
    },
    alerts: {
      marginBottom: 28,
      paddingBottom: 8,
    },
    block: {
      paddingVertical: 14,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
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
    btnNew: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      height: 36,
      paddingHorizontal: 12,
      borderRadius: radius.pill,
      backgroundColor: colors.teal[300],
    },
    btnNewLabel: {
      fontFamily: typography.uiBold,
      fontSize: 12,
      color: '#04262b',
    },
    chatRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 8,
      paddingHorizontal: 8,
      borderRadius: radius.sm,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.bgApp,
    },
    chatRowActive: {
      borderColor: 'rgba(34,211,238,0.45)',
      backgroundColor: 'rgba(34,211,238,0.08)',
    },
    chatMain: {
      flex: 1,
      paddingVertical: 2,
    },
    chatTitle: {
      ...type.rowTitle,
      color: colors.textPrimary,
    },
    chatTitleActive: {
      color: colors.teal[300],
    },
    chatMeta: {
      ...type.meta,
      color: colors.textMuted,
      marginTop: 2,
    },
    emptyThread: {
      flexGrow: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 48,
      gap: 8,
    },
    emptyTitle: {
      fontFamily: typography.display,
      fontSize: 22,
      color: colors.textPrimary,
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
    bubbleError: {
      borderColor: colors.gold[500],
      backgroundColor: colors.gold[50],
    },
    bubbleText: {
      ...type.body,
      color: colors.textPrimary,
    },
    bubbleErrorText: {
      color: colors.gold[300],
    },
    composerWrap: {
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 12,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
      backgroundColor: colors.bgApp,
    },
    composer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    btnSend: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      height: 40,
      paddingHorizontal: 14,
      borderRadius: radius.pill,
      backgroundColor: colors.teal[300],
    },
    btnSendDisabled: {
      backgroundColor: colors.surfaceAlt,
    },
    btnSendLabel: {
      fontFamily: typography.uiBold,
      fontSize: 12,
      color: '#04262b',
    },
    chatGate: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      minHeight: 40,
      marginHorizontal: 16,
      marginBottom: 12,
      paddingHorizontal: 13,
      paddingVertical: 10,
      borderWidth: 0.5,
      borderColor: colors.border,
      borderRadius: 20,
    },
    chatInput: {
      flex: 1,
      height: 40,
      borderRadius: radius.pill,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      color: colors.textPrimary,
      fontFamily: type.body.fontFamily,
      fontSize: 13,
      paddingHorizontal: 14,
      paddingVertical: 0,
    },
    renameInput: {
      height: 42,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceAlt,
      color: colors.textPrimary,
      paddingHorizontal: 12,
      fontFamily: typography.ui,
      fontSize: 15,
      marginBottom: 16,
    },
    renameActions: {
      flexDirection: 'row',
      gap: 10,
    },
  });
}
