import { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Modal,
  Pressable,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react-native';
import {
  Screen,
  DisplayTitle,
  BodySm,
  Card,
  IconButton,
  EmptyState,
  ButtonPrimary,
  ButtonSecondary,
  RowIcon,
} from '@/src/components';
import {
  CategoryIcon,
  iconBg,
  CATEGORY_ICON_OPTIONS,
  CATEGORY_TINT_OPTIONS,
} from '@/src/components/CategoryIcon';
import { useDb } from '@/src/hooks/DbProvider';
import { CategoryWithSpend } from '@/src/db/types';
import { formatMoney, parseMoneyInput } from '@/src/lib/format';
import { colors, typography, TintName, tintPalette } from '@/src/theme/theme';

type Draft = {
  id?: string;
  name: string;
  icon: string;
  tint: TintName;
  capText: string;
};

const emptyDraft = (): Draft => ({
  name: '',
  icon: 'heart',
  tint: 'teal',
  capText: '',
});

export default function CategoriesScreen() {
  const router = useRouter();
  const { categories, settings, saveCategory, removeCategory } = useDb();
  const currency = settings?.currency ?? 'RD$';
  const [modalOpen, setModalOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft());
  const [saving, setSaving] = useState(false);

  const title = useMemo(() => (draft.id ? 'Edit category' : 'Add category'), [draft.id]);

  const openCreate = () => {
    setDraft(emptyDraft());
    setModalOpen(true);
  };

  const openEdit = (cat: CategoryWithSpend) => {
    setDraft({
      id: cat.id,
      name: cat.name,
      icon: cat.icon,
      tint: cat.tint,
      capText: cat.capCents ? String(cat.capCents / 100) : '',
    });
    setModalOpen(true);
  };

  const onSave = async () => {
    const name = draft.name.trim();
    if (!name) {
      Alert.alert('Name required', 'Give this category a name.');
      return;
    }
    const capCents = parseMoneyInput(draft.capText);
    setSaving(true);
    try {
      await saveCategory({
        id: draft.id,
        name,
        icon: draft.icon,
        tint: draft.tint,
        capCents,
        sortOrder: draft.id
          ? categories.find((c) => c.id === draft.id)?.sortOrder ?? categories.length
          : categories.length,
      });
      setModalOpen(false);
      setDraft(emptyDraft());
    } finally {
      setSaving(false);
    }
  };

  const onDelete = (cat: CategoryWithSpend) => {
    Alert.alert(
      'Delete category?',
      `"${cat.name}" will be removed. Past expenses stay in history without this category.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            removeCategory(cat.id).catch(() => Alert.alert('Delete failed', 'Try again.'));
          },
        },
      ],
    );
  };

  return (
    <Screen edges={['top', 'bottom']} padded={false}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.topbar}>
          <IconButton onPress={() => router.back()}>
            <ArrowLeft size={16} color={colors.textSecondary} />
          </IconButton>
          <DisplayTitle style={{ fontSize: 17 }}>Categories & caps</DisplayTitle>
          <IconButton onPress={openCreate}>
            <Plus size={16} color={colors.textSecondary} />
          </IconButton>
        </View>

        <BodySm style={{ marginBottom: 14 }}>
          Caps are monthly limits. Changes show up on Home right away.
        </BodySm>

        {categories.length === 0 ? (
          <EmptyState
            title="No categories"
            message="Add a category and set a monthly cap to start tracking."
          />
        ) : (
          <View style={{ gap: 9 }}>
            {categories.map((cat) => (
              <Card key={cat.id} style={styles.rowCard}>
                <Pressable onPress={() => openEdit(cat)} style={styles.rowMain}>
                  <RowIcon backgroundColor={iconBg(cat.tint)}>
                    <CategoryIcon name={cat.icon} tint={cat.tint} />
                  </RowIcon>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle}>{cat.name}</Text>
                    <Text style={styles.rowSub}>
                      Cap {formatMoney(cat.capCents, currency)} · spent{' '}
                      {formatMoney(cat.spentCents, currency)}
                    </Text>
                  </View>
                </Pressable>
                <Pressable
                  onPress={() => onDelete(cat)}
                  hitSlop={8}
                  accessibilityLabel={`Delete ${cat.name}`}
                >
                  <Trash2 size={16} color={colors.coral[500]} />
                </Pressable>
              </Card>
            ))}
          </View>
        )}

        <ButtonSecondary
          label="Add category"
          onPress={openCreate}
          style={{ marginTop: 16 }}
        />
      </ScrollView>

      <Modal visible={modalOpen} transparent animationType="slide">
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <DisplayTitle style={{ fontSize: 18, marginBottom: 12 }}>{title}</DisplayTitle>

            <Text style={styles.label}>Name</Text>
            <TextInput
              value={draft.name}
              onChangeText={(name) => setDraft((d) => ({ ...d, name }))}
              placeholder="e.g. Groceries"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
            />

            <Text style={styles.label}>Monthly cap</Text>
            <TextInput
              value={draft.capText}
              onChangeText={(capText) => setDraft((d) => ({ ...d, capText }))}
              placeholder={`${currency}0`}
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
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
                    { backgroundColor: iconBg(draft.tint) },
                  ]}
                >
                  <CategoryIcon name={icon} tint={draft.tint} />
                </Pressable>
              ))}
            </View>

            <Text style={styles.label}>Color</Text>
            <View style={styles.chipRow}>
              {CATEGORY_TINT_OPTIONS.map((tint) => (
                <Pressable
                  key={tint}
                  onPress={() => setDraft((d) => ({ ...d, tint }))}
                  style={[
                    styles.tintChip,
                    { backgroundColor: tintPalette[tint][500] },
                    draft.tint === tint && styles.tintChipActive,
                  ]}
                />
              ))}
            </View>

            <View style={styles.actions}>
              <ButtonSecondary
                label="Cancel"
                style={{ flex: 1 }}
                onPress={() => {
                  setModalOpen(false);
                  setDraft(emptyDraft());
                }}
              />
              <ButtonPrimary label="Save" loading={saving} style={{ flex: 1 }} onPress={onSave} />
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 32 },
  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  rowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 13,
  },
  rowMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
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
    borderColor: colors.teal[500],
    borderWidth: 2,
  },
  tintChip: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  tintChipActive: {
    borderWidth: 2,
    borderColor: colors.textPrimary,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
});
