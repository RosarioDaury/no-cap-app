import { useMemo, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Plus, Trash2 } from 'lucide-react-native';
import { Screen, DisplayTitle, BodySm, KeyboardSheet, KeyboardFormScroll, BrandMark, OnboardingProgress, Chip } from '@/src/components';
import { ButtonPrimary, ButtonSecondary } from '@/src/components/Buttons';
import {
  CategoryIcon,
  CATEGORY_ICON_OPTIONS,
  CATEGORY_TINT_OPTIONS,
  useIconBg,
} from '@/src/components/CategoryIcon';
import { useOnboarding } from '@/src/hooks/OnboardingContext';
import { useDb } from '@/src/hooks/DbProvider';
import { useTheme } from '@/src/hooks/ThemeProvider';
import { BUDGET_TEMPLATES } from '@/src/db/database';
import { ThemeColors, TintName, glow, type, typography } from '@/src/theme/theme';
import { formatMoney, parseMoneyInput } from '@/src/lib/format';
import {
  CategoryDuration,
  activeMonthFromDuration,
  cycleCategoryDuration,
  durationChoiceLabel,
} from '@/src/lib/categories';

type DraftCat = {
  name: string;
  icon: string;
  tint: TintName;
  capText: string;
  duration: CategoryDuration;
};

type AddDraft = {
  name: string;
  icon: string;
  tint: TintName;
  duration: CategoryDuration;
};

const emptyAdd = (): AddDraft => ({ name: '', icon: 'heart', tint: 'teal', duration: 'ongoing' });

export default function BudgetSetupScreen() {
  const router = useRouter();
  const { templateId, aiConsent, displayName } = useOnboarding();
  const { finishOnboarding } = useDb();
  const { colors, tintPalette } = useTheme();
  const iconBg = useIconBg();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const template = BUDGET_TEMPLATES.find((t) => t.id === templateId) ?? BUDGET_TEMPLATES[0];

  const [cats, setCats] = useState<DraftCat[]>(
    template.categories.map((c) => ({
      name: c.name,
      icon: c.icon,
      tint: c.tint,
      capText: c.capCents ? String(c.capCents / 100) : '',
      duration: 'ongoing' as CategoryDuration,
    })),
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [addDraft, setAddDraft] = useState<AddDraft>(emptyAdd());
  const [loading, setLoading] = useState(false);
  const monthName = new Date().toLocaleDateString('en-US', { month: 'long' });
  const totalCapped = cats.reduce((s, c) => s + parseMoneyInput(c.capText), 0);

  const canContinue = cats.length > 0;

  const onContinue = async () => {
    setLoading(true);
    try {
      await finishOnboarding({
        aiConsent,
        templateId,
        displayName: displayName.trim(),
        categories: cats.map((c) => ({
          name: c.name,
          icon: c.icon,
          tint: c.tint,
          capCents: parseMoneyInput(c.capText),
          activeMonth: activeMonthFromDuration(c.duration),
        })),
      });
      router.replace('/(tabs)');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen edges={['top', 'bottom']} style={{ paddingTop: 20 }} padded={false}>
      <KeyboardFormScroll contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20, flexGrow: 1 }}>
        <BrandMark size={28} />
        <OnboardingProgress step={4} />
        <DisplayTitle style={{ fontSize: 28, marginBottom: 6 }}>
          How much can each one take this month?
        </DisplayTitle>
        <BodySm style={{ marginBottom: 18 }}>
          Add a monthly cap, or leave it blank for no limit. You can also make a category last this month or next month only.
        </BodySm>

        <View style={styles.totalBlock}>
          <Text style={styles.totalLabel}>Total capped</Text>
          <Text style={styles.totalAmt}>{formatMoney(totalCapped)}</Text>
          <View style={styles.segBar}>
            {cats.map((c, idx) => {
              const share = totalCapped > 0 ? parseMoneyInput(c.capText) / totalCapped : 0;
              if (share <= 0) return null;
              return (
                <View
                  key={`${c.name}-${idx}`}
                  style={{
                    flex: share,
                    height: 6,
                    backgroundColor: tintPalette[c.tint][500],
                  }}
                />
              );
            })}
            <View style={{ flex: 0.08, height: 6, backgroundColor: colors.border }} />
          </View>
        </View>

        <View style={{ gap: 0 }}>
          {cats.map((c, idx) => {
            const share = totalCapped > 0 ? parseMoneyInput(c.capText) / totalCapped : 0;
            return (
              <View key={`${c.name}-${idx}`} style={styles.catRow}>
                <View style={[styles.iconChip, { backgroundColor: iconBg(c.tint) }]}>
                  <CategoryIcon name={c.icon} tint={c.tint} size={16} shade={500} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.catName}>{c.name}</Text>
                  <Pressable
                    onPress={() => {
                      const next = [...cats];
                      next[idx] = { ...c, duration: cycleCategoryDuration(c.duration) };
                      setCats(next);
                    }}
                    hitSlop={6}
                    accessibilityLabel={`${c.name} duration, ${durationChoiceLabel(c.duration)}`}
                  >
                    <Text style={styles.durationHint}>{durationChoiceLabel(c.duration)}</Text>
                  </Pressable>
                  <View style={styles.miniTrack}>
                    <View
                      style={[
                        styles.miniFill,
                        {
                          width: `${Math.min(100, share * 100)}%`,
                          backgroundColor: tintPalette[c.tint][500],
                        },
                      ]}
                    />
                  </View>
                </View>
                <TextInput
                  value={c.capText}
                  onChangeText={(t) => {
                    const next = [...cats];
                    next[idx] = { ...c, capText: t };
                    setCats(next);
                  }}
                  placeholder="No limit"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="number-pad"
                  style={styles.capInput}
                />
                <Pressable
                  onPress={() => setCats((prev) => prev.filter((_, i) => i !== idx))}
                  hitSlop={8}
                  accessibilityLabel={`Remove ${c.name}`}
                >
                  <Trash2 size={15} color={colors.textMuted} />
                </Pressable>
              </View>
            );
          })}

          <Pressable
            onPress={() => {
              setAddDraft(emptyAdd());
              setModalOpen(true);
            }}
            style={styles.addBtn}
          >
            <Plus size={16} color={colors.textSecondary} />
            <Text style={styles.addText}>Add category</Text>
          </Pressable>
        </View>

        <View style={{ flex: 1, minHeight: 24 }} />
        <Pressable
          onPress={onContinue}
          disabled={!canContinue || loading}
          style={({ pressed }) => [
            { opacity: pressed || !canContinue || loading ? 0.75 : 1 },
            glow.teal,
          ]}
        >
          <LinearGradient
            colors={[colors.teal[300], colors.teal[700]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.cta}
          >
            <Text style={styles.ctaText}>Start tracking {monthName}</Text>
          </LinearGradient>
        </Pressable>
        <BodySm style={{ textAlign: 'center', marginTop: 8, marginBottom: 10 }}>
          You can change every cap later
        </BodySm>
      </KeyboardFormScroll>

      <KeyboardSheet
        visible={modalOpen}
        onRequestClose={() => {
          setModalOpen(false);
          setAddDraft(emptyAdd());
        }}
        scroll
      >
        <DisplayTitle style={{ fontSize: 18, marginBottom: 12 }}>Add category</DisplayTitle>

        <Text style={styles.label}>Name</Text>
        <TextInput
          value={addDraft.name}
          onChangeText={(name) => setAddDraft((d) => ({ ...d, name }))}
          placeholder="Category name"
          placeholderTextColor={colors.textMuted}
          style={styles.modalInput}
        />

        <Text style={styles.label}>Icon</Text>
        <View style={styles.chipRow}>
          {CATEGORY_ICON_OPTIONS.map((icon) => (
            <Pressable
              key={icon}
              onPress={() => setAddDraft((d) => ({ ...d, icon }))}
              style={[
                styles.modalIconChip,
                addDraft.icon === icon && styles.iconChipActive,
                { backgroundColor: iconBg(addDraft.tint) },
              ]}
            >
              <CategoryIcon name={icon} tint={addDraft.tint} />
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>Color</Text>
        <View style={styles.chipRow}>
          {CATEGORY_TINT_OPTIONS.map((tint) => (
            <Pressable
              key={tint}
              onPress={() => setAddDraft((d) => ({ ...d, tint }))}
              style={[
                styles.tintChip,
                { backgroundColor: tintPalette[tint][500] },
                addDraft.tint === tint && styles.tintChipActive,
              ]}
            />
          ))}
        </View>

        <Text style={styles.label}>How long</Text>
        <View style={styles.chipRow}>
          <Chip
            label="Ongoing"
            selected={addDraft.duration === 'ongoing'}
            onPress={() => setAddDraft((d) => ({ ...d, duration: 'ongoing' }))}
          />
          <Chip
            label="This month only"
            selected={addDraft.duration === 'this-month'}
            onPress={() => setAddDraft((d) => ({ ...d, duration: 'this-month' }))}
          />
          <Chip
            label="Next month only"
            selected={addDraft.duration === 'next-month'}
            onPress={() => setAddDraft((d) => ({ ...d, duration: 'next-month' }))}
          />
        </View>

        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
          <ButtonSecondary
            label="Cancel"
            onPress={() => {
              setModalOpen(false);
              setAddDraft(emptyAdd());
            }}
            style={{ flex: 1 }}
          />
          <ButtonPrimary
            label="Add"
            style={{ flex: 1 }}
            onPress={() => {
              if (!addDraft.name.trim()) return;
              setCats((prev) => [
                ...prev,
                {
                  name: addDraft.name.trim(),
                  icon: addDraft.icon,
                  tint: addDraft.tint,
                  capText: '',
                  duration: addDraft.duration,
                },
              ]);
              setAddDraft(emptyAdd());
              setModalOpen(false);
            }}
          />
        </View>
      </KeyboardSheet>
    </Screen>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    totalBlock: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      marginBottom: 16,
    },
    totalLabel: {
      ...type.eyebrow,
      color: colors.textMuted,
      marginBottom: 4,
    },
    totalAmt: {
      ...type.amountLg,
      color: colors.teal[300],
      marginBottom: 10,
    },
    segBar: {
      flexDirection: 'row',
      height: 6,
      borderRadius: 3,
      overflow: 'hidden',
      backgroundColor: colors.border,
    },
    catRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 11,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    iconChip: {
      width: 32,
      height: 32,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    catName: {
      ...type.rowTitle,
      color: colors.textPrimary,
      marginBottom: 2,
    },
    durationHint: {
      ...type.meta,
      color: colors.textMuted,
      marginBottom: 6,
    },
    miniTrack: {
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.surfaceAlt,
      overflow: 'hidden',
    },
    miniFill: {
      height: '100%',
      borderRadius: 2,
    },
    capInput: {
      width: 86,
      height: 38,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceAlt,
      color: colors.textPrimary,
      paddingHorizontal: 10,
      fontFamily: type.amountSm.fontFamily,
      fontSize: 14,
      textAlign: 'right',
    },
    cta: {
      height: 54,
      borderRadius: 999,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 16,
    },
    ctaText: {
      fontFamily: type.rowTitle.fontFamily,
      fontSize: 14,
      color: '#04262b',
    },
    addBtn: {
      height: 48,
      borderRadius: 999,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: colors.border,
      backgroundColor: colors.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 6,
    },
    addText: {
      fontFamily: typography.uiBold,
      fontSize: 13,
      color: colors.textSecondary,
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
    modalInput: {
      height: 44,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceAlt,
      color: colors.textPrimary,
      paddingHorizontal: 12,
      fontFamily: typography.ui,
      marginBottom: 10,
    },
    chipRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 12,
    },
    modalIconChip: {
      width: 36,
      height: 36,
      borderRadius: 11,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconChipActive: {
      borderWidth: 2,
      borderColor: colors.textPrimary,
    },
    tintChip: {
      width: 28,
      height: 28,
      borderRadius: 999,
    },
    tintChipActive: {
      borderWidth: 2,
      borderColor: colors.textPrimary,
    },
  });
}
