import { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Pressable,
  Modal,
  Alert,
} from 'react-native';
import { Lightbulb, Plus } from 'lucide-react-native';
import {
  Screen,
  Card,
  ProgressBar,
  IconButton,
  EmptyState,
  BodySm,
  DisplayTitle,
  ButtonPrimary,
  ButtonSecondary,
  RowIcon,
} from '@/src/components';
import {
  CategoryIcon,
  useIconBg,
  CATEGORY_ICON_OPTIONS,
} from '@/src/components/CategoryIcon';
import { useDb } from '@/src/hooks/DbProvider';
import { useTheme } from '@/src/hooks/ThemeProvider';
import { Goal } from '@/src/db/types';
import { formatMoney, formatShortDate, parseMoneyInput } from '@/src/lib/format';
import { ThemeColors, typography } from '@/src/theme/theme';

type GoalDraft = {
  id?: string;
  name: string;
  icon: string;
  targetText: string;
  savedText: string;
  dueDate: string;
};

type ContributeDraft = {
  goal: Goal;
  amountText: string;
};

const emptyGoalDraft = (): GoalDraft => ({
  name: '',
  icon: 'umbrella',
  targetText: '',
  savedText: '0',
  dueDate: '',
});

export default function GoalsScreen() {
  const { goals, categories, settings, saveGoal, removeGoal, contributeGoal } = useDb();
  const { colors } = useTheme();
  const iconBg = useIconBg();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const currency = settings?.currency ?? 'RD$';
  const totalCap = categories.reduce((s, c) => s + c.capCents, 0);
  const totalSpent = categories.reduce((s, c) => s + c.spentCents, 0);
  const room = Math.max(0, totalCap - totalSpent);

  const [goalModal, setGoalModal] = useState(false);
  const [draft, setDraft] = useState<GoalDraft>(emptyGoalDraft());
  const [saving, setSaving] = useState(false);
  const [contribute, setContribute] = useState<ContributeDraft | null>(null);
  const [contributing, setContributing] = useState(false);

  const modalTitle = useMemo(() => (draft.id ? 'Edit goal' : 'Add goal'), [draft.id]);

  const openCreate = () => {
    setDraft(emptyGoalDraft());
    setGoalModal(true);
  };

  const openEdit = (g: Goal) => {
    setDraft({
      id: g.id,
      name: g.name,
      icon: g.icon,
      targetText: g.targetCents ? String(g.targetCents / 100) : '',
      savedText: String(g.savedCents / 100),
      dueDate: g.dueDate ?? '',
    });
    setGoalModal(true);
  };

  const onSaveGoal = async () => {
    const name = draft.name.trim();
    if (!name) {
      Alert.alert('Name required', 'Give this goal a name.');
      return;
    }
    const targetCents = parseMoneyInput(draft.targetText);
    if (targetCents <= 0) {
      Alert.alert('Target required', 'Set a target amount greater than zero.');
      return;
    }
    const due = draft.dueDate.trim();
    if (due && !/^\d{4}-\d{2}-\d{2}$/.test(due)) {
      Alert.alert('Due date', 'Use YYYY-MM-DD or leave blank.');
      return;
    }
    setSaving(true);
    try {
      await saveGoal({
        id: draft.id,
        name,
        icon: draft.icon,
        targetCents,
        savedCents: parseMoneyInput(draft.savedText),
        dueDate: due || null,
      });
      setGoalModal(false);
      setDraft(emptyGoalDraft());
    } catch {
      Alert.alert('Could not save', 'Try again.');
    } finally {
      setSaving(false);
    }
  };

  const onDeleteGoal = (g: Goal) => {
    Alert.alert('Delete goal?', `"${g.name}" will be removed.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          removeGoal(g.id).catch(() => Alert.alert('Delete failed', 'Try again.'));
        },
      },
    ]);
  };

  const onContribute = async () => {
    if (!contribute) return;
    const amount = parseMoneyInput(contribute.amountText);
    if (amount <= 0) {
      Alert.alert('Enter an amount', 'Contribution must be greater than zero.');
      return;
    }
    setContributing(true);
    try {
      await contributeGoal(contribute.goal.id, amount);
      setContribute(null);
    } catch {
      Alert.alert('Could not add', 'Try again.');
    } finally {
      setContributing(false);
    }
  };

  return (
    <Screen edges={['top']} padded={false}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.topbar}>
          <Text style={styles.title}>Goals</Text>
          <IconButton onPress={openCreate}>
            <Plus size={16} color={colors.textSecondary} />
          </IconButton>
        </View>

        {goals.length === 0 ? (
          <EmptyState
            title="No goals yet"
            message="Tap + to add a savings or payoff goal and track progress."
          />
        ) : (
          <View style={{ gap: 11, flex: 1 }}>
            {goals.map((g) => {
              const progress = g.targetCents > 0 ? Math.min(1, g.savedCents / g.targetCents) : 0;
              return (
                <Card key={g.id}>
                  <Pressable onPress={() => openEdit(g)}>
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
                  </Pressable>
                  <View style={styles.cardActions}>
                    <Pressable
                      onPress={() => setContribute({ goal: g, amountText: '' })}
                      style={styles.linkBtn}
                    >
                      <Text style={styles.linkText}>Contribute</Text>
                    </Pressable>
                    <Pressable onPress={() => onDeleteGoal(g)} style={styles.linkBtn}>
                      <Text style={[styles.linkText, { color: colors.coral[500] }]}>Delete</Text>
                    </Pressable>
                  </View>
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

      <Modal visible={goalModal} transparent animationType="slide">
        <View style={styles.backdrop}>
          <ScrollView contentContainerStyle={styles.sheetScroll} keyboardShouldPersistTaps="handled">
            <View style={styles.sheet}>
              <DisplayTitle style={{ fontSize: 18, marginBottom: 12 }}>{modalTitle}</DisplayTitle>

              <Text style={styles.label}>Name</Text>
              <TextInput
                value={draft.name}
                onChangeText={(name) => setDraft((d) => ({ ...d, name }))}
                placeholder="Emergency fund"
                placeholderTextColor={colors.textMuted}
                style={styles.input}
              />

              <Text style={styles.label}>Target</Text>
              <TextInput
                value={draft.targetText}
                onChangeText={(targetText) => setDraft((d) => ({ ...d, targetText }))}
                placeholder={`${currency}0`}
                placeholderTextColor={colors.textMuted}
                keyboardType="decimal-pad"
                style={styles.input}
              />

              <Text style={styles.label}>Already saved</Text>
              <TextInput
                value={draft.savedText}
                onChangeText={(savedText) => setDraft((d) => ({ ...d, savedText }))}
                placeholder={`${currency}0`}
                placeholderTextColor={colors.textMuted}
                keyboardType="decimal-pad"
                style={styles.input}
              />

              <Text style={styles.label}>Due date (YYYY-MM-DD)</Text>
              <TextInput
                value={draft.dueDate}
                onChangeText={(dueDate) => setDraft((d) => ({ ...d, dueDate }))}
                placeholder="Optional"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                style={styles.input}
              />

              <Text style={styles.label}>Icon</Text>
              <View style={styles.chipRow}>
                {CATEGORY_ICON_OPTIONS.map((icon) => (
                  <Pressable
                    key={icon}
                    onPress={() => setDraft((d) => ({ ...d, icon }))}
                    style={[
                      styles.iconChip,
                      draft.icon === icon && styles.iconChipActive,
                      { backgroundColor: iconBg('plum') },
                    ]}
                  >
                    <CategoryIcon name={icon} tint="plum" />
                  </Pressable>
                ))}
              </View>

              <View style={styles.actions}>
                <ButtonSecondary
                  label="Cancel"
                  style={{ flex: 1 }}
                  onPress={() => {
                    setGoalModal(false);
                    setDraft(emptyGoalDraft());
                  }}
                />
                <ButtonPrimary label="Save" loading={saving} style={{ flex: 1 }} onPress={onSaveGoal} />
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      <Modal visible={!!contribute} transparent animationType="slide">
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <DisplayTitle style={{ fontSize: 18, marginBottom: 8 }}>Contribute</DisplayTitle>
            <BodySm style={{ marginBottom: 12 }}>
              Add to {contribute?.goal.name ?? 'goal'}
            </BodySm>
            <TextInput
              value={contribute?.amountText ?? ''}
              onChangeText={(amountText) =>
                setContribute((c) => (c ? { ...c, amountText } : c))
              }
              placeholder={`${currency}0`}
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
              style={styles.input}
              autoFocus
            />
            <View style={styles.actions}>
              <ButtonSecondary
                label="Cancel"
                style={{ flex: 1 }}
                onPress={() => setContribute(null)}
              />
              <ButtonPrimary
                label="Add"
                loading={contributing}
                style={{ flex: 1 }}
                onPress={onContribute}
              />
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
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
    cardActions: {
      flexDirection: 'row',
      gap: 16,
      marginTop: 10,
    },
    linkBtn: {
      paddingVertical: 2,
    },
    linkText: {
      fontFamily: typography.uiSemiBold,
      fontSize: 12,
      color: colors.plum[500],
    },
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.55)',
      justifyContent: 'flex-end',
    },
    sheetScroll: {
      flexGrow: 1,
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 20,
      paddingBottom: 36,
      borderWidth: 1,
      borderColor: colors.border,
    },
    label: {
      fontFamily: typography.uiBold,
      fontSize: 11,
      letterSpacing: 0.4,
      textTransform: 'uppercase',
      color: colors.textMuted,
      marginBottom: 6,
      marginTop: 4,
    },
    input: {
      height: 42,
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
    chipRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 12,
    },
    iconChip: {
      width: 36,
      height: 36,
      borderRadius: 11,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    iconChipActive: {
      borderColor: colors.plum[500],
      borderWidth: 2,
    },
    actions: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 8,
    },
  });
}
