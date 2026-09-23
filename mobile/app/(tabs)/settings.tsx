import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Switch,
  TextInput,
} from 'react-native';
import { Href, useRouter } from 'expo-router';
import {
  DollarSign,
  LayoutGrid,
  Bell,
  Receipt,
  Sparkles,
  Download,
  Upload,
  Moon,
  Sun,
  FlaskConical,
  User,
  RotateCcw,
  ArrowLeft,
  LogIn,
  LogOut,
} from 'lucide-react-native';
import { Screen, DisplayTitle, Eyebrow, ListRow, KeyboardSheet, BrandLockup, BrandMark, IconButton } from '@/src/components';
import { ButtonPrimary, ButtonSecondary } from '@/src/components/Buttons';
import { useDb } from '@/src/hooks/DbProvider';
import { useAuth } from '@/src/hooks/AuthProvider';
import { useTheme } from '@/src/hooks/ThemeProvider';
import { ThemeColors, typography } from '@/src/theme/theme';

const CURRENCY_OPTIONS = [
  { code: 'RD$', label: 'Dominican peso (RD$)' },
  { code: 'USD', label: 'US dollar (USD)' },
] as const;

export default function SettingsScreen() {
  const router = useRouter();
  const { settings, setSetting, loadSampleData, categories, bills, exportBackup, importBackup, resetData } =
    useDb();
  const { user, signOut } = useAuth();
  const { colors, mode, setMode } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

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
      'This replaces goals, debts, bills, and transactions with demo numbers. Your categories and caps stay as they are.',
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
      'This replaces all categories, transactions, goals, debts, and bills with the backup file.',
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

  const onPickTheme = () => {
    const current = settings?.theme === 'light' ? 'light' : 'dark';
    Alert.alert('Theme', 'Choose light or dark appearance.', [
      {
        text: `Dark${current === 'dark' ? ' ✓' : ''}`,
        onPress: () => {
          void setMode('dark');
        },
      },
      {
        text: `Light${current === 'light' ? ' ✓' : ''}`,
        onPress: () => {
          void setMode('light');
        },
      },
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

  const onSignOut = () => {
    Alert.alert('Sign out?', 'Chats stay on the server. This device will forget the session.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: () => {
          signOut().catch(() => Alert.alert('Sign out failed', 'Try again.'));
        },
      },
    ]);
  };

  const onReset = () => {
    Alert.alert(
      'Reset NoCap?',
      'This permanently deletes all categories, transactions, goals, debts, and bills on this device.',
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

  const ThemeIcon = mode === 'light' ? Sun : Moon;

  return (
    <Screen edges={['top']} padded={false}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.settingsHeader}>
          <IconButton onPress={() => router.back()} accessibilityLabel="Go back">
            <ArrowLeft size={16} color={colors.textSecondary} />
          </IconButton>
          <BrandLockup size="md" />
          <View style={{ width: 36 }} />
        </View>

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
          />
          <ListRow
            icon={<Receipt size={16} color={colors.textSecondary} />}
            title="Recurring bills"
            value={
              bills.length === 0
                ? 'None'
                : `${bills.filter((b) => !b.paidThisMonth).length} open`
            }
            onPress={() => router.push('/bills' as Href)}
            last
          />
        </View>

        <Eyebrow>AI & Data</Eyebrow>
        <View style={{ marginBottom: 16 }}>
          <View style={styles.switchRow}>
            <Sparkles size={16} color={colors.textSecondary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.switchTitle}>Conversational AI advice</Text>
              <Text style={styles.switchSub}>
                {user
                  ? 'On when you are online. Sign out to pause saved chats.'
                  : 'Register or sign in, then stay online to use chat.'}
              </Text>
            </View>
            <Switch
              value={!!settings?.aiConsent}
              onValueChange={(v) => setSetting({ aiConsent: v ? 1 : 0 })}
              trackColor={{ false: colors.surfaceAlt, true: colors.teal[700] }}
              thumbColor={settings?.aiConsent ? colors.teal[300] : colors.textMuted}
            />
          </View>

          {user ? (
            <ListRow
              icon={<LogOut size={16} color={colors.textSecondary} />}
              title="Signed in"
              value={`@${user.username}`}
              subtitle={`${user.email} · sessions live on the server`}
              onPress={onSignOut}
            />
          ) : (
            <ListRow
              icon={<LogIn size={16} color={colors.textSecondary} />}
              title="NoCap account"
              subtitle="Register or sign in for saved chats and AI advice"
              onPress={() => router.push('/login')}
            />
          )}
          <ListRow
            icon={<FlaskConical size={16} color={colors.textSecondary} />}
            title="Load sample data"
            subtitle={
              categories.length === 0
                ? 'Needs categories first'
                : 'Demo goals, debts, bills, and spends'
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

        <Eyebrow>App</Eyebrow>
        <View>
          <ListRow
            icon={<ThemeIcon size={16} color={colors.textSecondary} />}
            title="Theme"
            value={settings?.theme === 'light' ? 'Light' : 'Dark'}
            showChevron
            onPress={onPickTheme}
          />
          <ListRow
            icon={<BrandMark size={18} />}
            title="About NoCap"
            onPress={() =>
              Alert.alert('NoCap', 'Offline-first budgeting. For real.\n\nYour caps, your device.')
            }
            last
          />
        </View>
      </ScrollView>

      <KeyboardSheet visible={nameModal} onRequestClose={() => setNameModal(false)}>
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
      </KeyboardSheet>
    </Screen>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    content: {
      paddingHorizontal: 20,
      paddingTop: 8,
      paddingBottom: 32,
    },
    settingsHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 20,
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
      fontFamily: typography.uiSemiBold,
      fontSize: 13,
      color: colors.textPrimary,
    },
    switchSub: {
      fontFamily: typography.ui,
      fontSize: 11,
      color: colors.textMuted,
      marginTop: 2,
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
}
