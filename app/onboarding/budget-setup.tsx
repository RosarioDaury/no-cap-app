import { useMemo, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Modal, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { Screen, Eyebrow, DisplayTitle, BodySm, Card, RowIcon } from '@/src/components';
import { ButtonPrimary, ButtonSecondary } from '@/src/components/Buttons';
import { CategoryIcon, iconBg } from '@/src/components/CategoryIcon';
import { useOnboarding } from '@/src/hooks/OnboardingContext';
import { useDb } from '@/src/hooks/DbProvider';
import { BUDGET_TEMPLATES } from '@/src/db/database';
import { colors, typography, TintName } from '@/src/theme/theme';
import { parseMoneyInput } from '@/src/lib/format';

type DraftCat = {
  name: string;
  icon: string;
  tint: TintName;
  capText: string;
};

export default function BudgetSetupScreen() {
  const router = useRouter();
  const { templateId, aiConsent } = useOnboarding();
  const { finishOnboarding } = useDb();
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
  const [newName, setNewName] = useState('');
  const [loading, setLoading] = useState(false);

  const canContinue = useMemo(() => cats.some((c) => parseMoneyInput(c.capText) > 0), [cats]);

  const onContinue = async () => {
    setLoading(true);
    try {
      await finishOnboarding({
        aiConsent,
        templateId,
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
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20, flexGrow: 1 }}>
        <Eyebrow>Step 2 of 4</Eyebrow>
        <DisplayTitle style={{ fontSize: 21, marginBottom: 6 }}>Set your caps</DisplayTitle>
        <BodySm style={{ marginBottom: 18 }}>Add a category and how much it can take each month.</BodySm>

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
            </Card>
          ))}

          <Pressable onPress={() => setModalOpen(true)} style={styles.addBtn}>
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
      </ScrollView>

      <Modal visible={modalOpen} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <DisplayTitle style={{ fontSize: 18, marginBottom: 12 }}>Add category</DisplayTitle>
            <TextInput
              value={newName}
              onChangeText={setNewName}
              placeholder="Category name"
              placeholderTextColor={colors.textMuted}
              style={styles.modalInput}
            />
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
              <ButtonSecondary
                label="Cancel"
                onPress={() => {
                  setModalOpen(false);
                  setNewName('');
                }}
                style={{ flex: 1 }}
              />
              <ButtonPrimary
                label="Add"
                style={{ flex: 1 }}
                onPress={() => {
                  if (!newName.trim()) return;
                  setCats((prev) => [
                    ...prev,
                    { name: newName.trim(), icon: 'heart', tint: 'teal', capText: '' },
                  ]);
                  setNewName('');
                  setModalOpen(false);
                }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  catRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 36,
    borderWidth: 1,
    borderColor: colors.border,
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
  },
});
