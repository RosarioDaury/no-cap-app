import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Switch,
  Modal,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  DollarSign,
  LayoutGrid,
  Bell,
  Sparkles,
  Download,
  Upload,
  Moon,
  Info,
  TrendingUp,
  Wallet,
  FlaskConical,
  User,
  RotateCcw,
} from 'lucide-react-native';
import { Screen, DisplayTitle, Eyebrow, ListRow } from '@/src/components';
import { ButtonPrimary, ButtonSecondary } from '@/src/components/Buttons';
import { useDb } from '@/src/hooks/DbProvider';
import { colors, typography } from '@/src/theme/theme';

const CURRENCY_OPTIONS = [
  { code: 'RD$', label: 'Dominican peso (RD$)' },
  { code: 'USD', label: 'US dollar (USD)' },
] as const;

export default function SettingsScreen() {
  const router = useRouter();
  const { settings, setSetting, loadSampleData, categories, exportBackup, importBackup, resetData } =
    useDb();

  const [nameModal, setNameModal] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [savingName, setSavingName] = useState(false);

  useEffect(() => {
    if (nameModal) {
      setNameDraft(settings?.displayName ?? '');
    }
  }, [nameModal, settings?.displayName]);

  const onLoadSample = () => {
    Alert.alert(
      'Load sample data?',
      'This replaces goals, debts, and transactions with demo numbers. Your categories and caps stay as they are.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Load samples',
          onPress: () => {
            loadSampleData({ force: true }).catch(() => {
              Alert.alert('Could not load samples', 'Try again.');
            });
          },
        },
      ],
    );
  };

  const onExport = () => {
    exportBackup().catch((err: unknown) => {
      const message = err instanceof Error ? err.message : 'Try again.';
      Alert.alert('Export failed', message);
    });
  };

  const onImport = () => {
    Alert.alert(
      'Import backup?',
      'This replaces all categories, transactions, goals, and debts with the backup file.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Import',
          style: 'destructive',
          onPress: () => {
            importBackup()
              .then((result) => {
                if (result === 'imported') {
                  Alert.alert('Backup restored', 'Your data was replaced from the file.');
                }
              })
              .catch((err: unknown) => {
                const message = err instanceof Error ? err.message : 'Invalid or unreadable file.';
                Alert.alert('Import failed', message);
              });
          },
        },
      ],
    );
  };

  const onPickCurrency = () => {
    const current = settings?.currency ?? 'RD$';
    Alert.alert('Currency', 'Used for all amounts in the app.', [
      ...CURRENCY_OPTIONS.map((opt) => ({
        text: `${opt.label}${current === opt.code ? ' ✓' : ''}`,
        onPress: () => setSetting({ currency: opt.code }),
      })),
      { text: 'Cancel', style: 'cancel' as const },
    ]);
  };

  const onSaveName = async () => {
    const trimmed = nameDraft.trim();
    if (!trimmed) {
      Alert.alert('Name required', 'Enter a display name for the Home greeting.');
      return;
    }
    setSavingName(true);
    try {
      await setSetting({ displayName: trimmed });
      setNameModal(false);
    } catch {
      Alert.alert('Could not save', 'Try again.');
    } finally {
      setSavingName(false);
    }
  };

  const onReset = () => {
    Alert.alert(
      'Reset NoCap?',
      'This permanently deletes all categories, transactions, goals, and debts on this device.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Are you sure?',
              'You will start onboarding again. Export a backup first if you need your data.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Reset everything',
                  style: 'destructive',
                  onPress: () => {
                    resetData().catch(() => {
                      Alert.alert('Reset failed', 'Try again.');
                    });
                  },
                },
              ],
            );
          },
        },
      ],
    );
  };

  return (
    <Screen edges={['top']} padded={false}>
      <ScrollView contentContainerStyle={styles.content}>
        <DisplayTitle style={{ fontSize: 19, marginBottom: 16 }}>Settings</DisplayTitle>

        <Eyebrow>Budget</Eyebrow>
        <View style={{ marginBottom: 16 }}>
          <ListRow
            icon={<User size={16} color={colors.textSecondary} />}
            title="Display name"
            value={settings?.displayName ?? 'Alex'}
            onPress={() => setNameModal(true)}
          />
          <ListRow
            icon={<DollarSign size={16} color={colors.textSecondary} />}
            title="Currency"
            value={settings?.currency ?? 'RD$'}
            onPress={onPickCurrency}
          />
          <ListRow
            icon={<LayoutGrid size={16} color={colors.textSecondary} />}
            title="Categories & caps"
            onPress={() => router.push('/categories')}
          />
          <ListRow
            icon={<Bell size={16} color={colors.textSecondary} />}
            title="Cap alerts"
            value={`At ${settings?.capAlertThreshold ?? 80}%`}
            onPress={() => {
              Alert.alert(
                'Cap alerts',
                'Warn on Home when a category reaches this % of its monthly cap.',
                [
                  ...[50, 80, 90, 100].map((pct) => ({
                    text: `${pct}%${(settings?.capAlertThreshold ?? 80) === pct ? ' ✓' : ''}`,
                    onPress: () => setSetting({ capAlertThreshold: pct }),
                  })),
                  { text: 'Cancel', style: 'cancel' as const },
                ],
              );
            }}
            last
          />
        </View>

        <Eyebrow>AI & Data</Eyebrow>
        <View style={{ marginBottom: 16 }}>
          <View style={styles.switchRow}>
            <Sparkles size={16} color={colors.textSecondary} />
            <Text style={styles.switchTitle}>Conversational AI advice</Text>
            <Switch
              value={!!settings?.aiConsent}
              onValueChange={(v) => setSetting({ aiConsent: v ? 1 : 0 })}
              trackColor={{ false: colors.surfaceAlt, true: colors.teal[700] }}
              thumbColor={settings?.aiConsent ? colors.teal[300] : colors.textMuted}
            />
          </View>
          <ListRow
            icon={<FlaskConical size={16} color={colors.textSecondary} />}
            title="Load sample data"
            subtitle={
              categories.length === 0
                ? 'Needs categories first'
                : 'Demo goals, debts, and spends'
            }
            onPress={categories.length === 0 ? undefined : onLoadSample}
            showChevron={categories.length > 0}
          />
          <ListRow
            icon={<Download size={16} color={colors.textSecondary} />}
            title="Export backup"
            subtitle="Share a JSON file of your data"
            onPress={onExport}
          />
          <ListRow
            icon={<Upload size={16} color={colors.textSecondary} />}
            title="Import backup"
            subtitle="Replaces all local data"
            onPress={onImport}
          />
          <ListRow
            icon={<RotateCcw size={16} color={colors.coral[500]} />}
            title="Reset NoCap"
            subtitle="Delete all data and restart onboarding"
            onPress={onReset}
            last
          />
        </View>

        <Eyebrow>More</Eyebrow>
        <View style={{ marginBottom: 16 }}>
          <ListRow
            icon={<Wallet size={16} color={colors.textSecondary} />}
            title="Income tracking"
            onPress={() => router.push('/income')}
          />
          <ListRow
            icon={<LayoutGrid size={16} color={colors.textSecondary} />}
            title="Debt tracker"
            onPress={() => router.push('/debt')}
          />
          <ListRow
            icon={<TrendingUp size={16} color={colors.textSecondary} />}
            title="History & trends"
            onPress={() => router.push('/history')}
            last
          />
        </View>

        <Eyebrow>App</Eyebrow>
        <View>
          <ListRow
            icon={<Moon size={16} color={colors.textSecondary} />}
            title="Theme"
            value="Dark (only)"
            showChevron={false}
          />
          <ListRow
            icon={<Info size={16} color={colors.textSecondary} />}
            title="About NoCap"
            onPress={() => Alert.alert('NoCap', 'Offline-first budgeting. For real.')}
            last
          />
        </View>
      </ScrollView>

      <Modal visible={nameModal} transparent animationType="slide">
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <DisplayTitle style={{ fontSize: 18, marginBottom: 12 }}>Display name</DisplayTitle>
            <Text style={styles.label}>Name</Text>
            <TextInput
              value={nameDraft}
              onChangeText={setNameDraft}
              placeholder="e.g. Alex"
              placeholderTextColor={colors.textMuted}
              autoFocus
              autoCapitalize="words"
              style={styles.input}
            />
            <View style={styles.actions}>
              <ButtonSecondary
                label="Cancel"
                style={{ flex: 1 }}
                onPress={() => setNameModal(false)}
              />
              <ButtonPrimary
                label="Save"
                loading={savingName}
                style={{ flex: 1 }}
                onPress={onSaveName}
              />
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 32,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  switchTitle: {
    flex: 1,
    fontFamily: typography.uiSemiBold,
    fontSize: 13,
    color: colors.textPrimary,
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
    marginBottom: 16,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
});
