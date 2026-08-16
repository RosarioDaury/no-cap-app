import { useMemo, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Plus, Trash2 } from 'lucide-react-native';
import { Screen, Eyebrow, DisplayTitle, BodySm, Card, RowIcon, KeyboardSheet, KeyboardFormScroll, BrandMark } from '@/src/components';
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
import { ThemeColors, TintName, typography } from '@/src/theme/theme';
import { parseMoneyInput } from '@/src/lib/format';

type DraftCat = {
  name: string;
  icon: string;
  tint: TintName;
  capText: string;
};

type AddDraft = {
  name: string;
  icon: string;
  tint: TintName;
};

const emptyAdd = (): AddDraft => ({ name: '', icon: 'heart', tint: 'teal' });

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
    })),
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [addDraft, setAddDraft] = useState<AddDraft>(emptyAdd());
  const [loading, setLoading] = useState(false);

  const canContinue = useMemo(
    () => cats.length > 0 && cats.some((c) => parseMoneyInput(c.capText) > 0),
    [cats],
  );

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
        <Eyebrow style={{ marginTop: 14 }}>Step 3 of 3</Eyebrow>
        <DisplayTitle style={{ fontSize: 21, marginBottom: 6 }}>Set your caps</DisplayTitle>
        <BodySm style={{ marginBottom: 18 }}>
          Add a category and a monthly cap. One amount per category — ranged caps are not used in v1.
        </BodySm>

        <View style={{ gap: 9 }}>
          {cats.map((c, idx) => (
            <Card key={`${c.name}-${idx}`} style={styles.catRow}>
              <RowIcon backgroundColor={iconBg(c.tint)}>
                <CategoryIcon name={c.icon} tint={c.tint} />
              </RowIcon>
              <Text style={styles.catName}>{c.name}</Text>
              <TextInput
                value={c.capText}
                onChangeText={(t) => {
                  const next = [...cats];
                  next[idx] = { ...c, capText: t };
                  setCats(next);
                }}
                placeholder="Cap"
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
            </Card>
          ))}

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
        <ButtonPrimary
          label="Continue"
          onPress={onContinue}
          loading={loading}
          disabled={!canContinue}
          style={{ marginTop: 16 }}
        />
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
                styles.iconChip,
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
    catRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 11,
      paddingHorizontal: 13,
    },
    catName: {
      flex: 1,
      fontFamily: typography.uiSemiBold,
      fontSize: 13,
      color: colors.textPrimary,
    },
    capInput: {
      width: 78,
      height: 38,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceAlt,
      color: colors.textPrimary,
      paddingHorizontal: 12,
      fontFamily: typography.ui,
      fontSize: 13,
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
    iconChip: {
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
