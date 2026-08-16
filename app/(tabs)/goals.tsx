import { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Pressable,
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
  KeyboardSheet,
  BrandMark,
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
import { ThemeColors, radius, type, typography } from '@/src/theme/theme';

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
          <View style={styles.brandTitle}>
            <BrandMark size={22} />
            <Text style={styles.title}>Goals</Text>
          </View>
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
          <View style={{ gap: 12, flex: 1 }}>
            <View style={styles.group}>
              {goals.map((g, i) => {
                const progress = g.targetCents > 0 ? Math.min(1, g.savedCents / g.targetCents) : 0;
                return (
                  <View
                    key={g.id}
                    style={[styles.goalRow, i === goals.length - 1 && { borderBottomWidth: 0 }]}
                  >
                    <Pressable onPress={() => openEdit(g)} style={styles.goalHeader}>
                      <View style={styles.iconChip}>
                        <CategoryIcon name={g.icon} tint="plum" size={16} shade={500} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.rowTitle}>{g.name}</Text>
                        <Text style={styles.rowSub}>
                          {g.dueDate ? `By ${formatShortDate(g.dueDate)}` : 'No due date'}
                        </Text>
                      </View>
                      <Text style={styles.pct}>{Math.round(progress * 100)}%</Text>
                    </Pressable>
                    <ProgressBar progress={progress} tint="plum" />
                    <View style={styles.goalMeta}>
                      <Text style={styles.rowSub}>
                        {formatMoney(g.savedCents, currency)} of {formatMoney(g.targetCents, currency)}
                      </Text>
                      <Pressable
                        onPress={() => setContribute({ goal: g, amountText: '' })}
                        hitSlop={8}
                      >
                        <Text style={styles.linkText}>Contribute</Text>
                      </Pressable>
                    </View>
                  </View>
                );
              })}
            </View>

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

      <KeyboardSheet
        visible={goalModal}
        onRequestClose={() => {
          setGoalModal(false);
          setDraft(emptyGoalDraft());
        }}
        scroll
      >
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
                styles.sheetIconChip,
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
        {draft.id ? (
          <ButtonSecondary
            label="Delete goal"
            style={{ marginTop: 8 }}
            onPress={() => {
              const g = goals.find((item) => item.id === draft.id);
              if (!g) return;
              setGoalModal(false);
              onDeleteGoal(g);
            }}
          />
        ) : null}
      </KeyboardSheet>

      <KeyboardSheet visible={!!contribute} onRequestClose={() => setContribute(null)}>
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
      </KeyboardSheet>
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
    brandTitle: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    title: {
      fontFamily: typography.displayMedium,
      fontSize: 19,
      color: colors.textPrimary,
    },
    group: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.xl,
      overflow: 'hidden',
    },
    goalRow: {
      paddingHorizontal: 12,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    goalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: 9,
    },
    iconChip: {
      width: 34,
      height: 34,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.plum[50],
    },
    rowTitle: {
      ...type.rowTitle,
      color: colors.textPrimary,
    },
    rowSub: {
      ...type.meta,
      color: colors.textMuted,
      marginTop: 1,
    },
    pct: {
      ...type.amountSm,
      color: colors.plum[500],
    },
    goalMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 8,
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
    sheetIconChip: {
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
