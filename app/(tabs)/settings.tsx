import { View, Text, StyleSheet, ScrollView, Alert, Switch } from 'react-native';
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
} from 'lucide-react-native';
import { Screen, DisplayTitle, Eyebrow, ListRow } from '@/src/components';
import { useDb } from '@/src/hooks/DbProvider';
import { colors, typography } from '@/src/theme/theme';

export default function SettingsScreen() {
  const router = useRouter();
  const { settings, setSetting, loadSampleData, categories } = useDb();

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

  return (
    <Screen edges={['top']} padded={false}>
      <ScrollView contentContainerStyle={styles.content}>
        <DisplayTitle style={{ fontSize: 19, marginBottom: 16 }}>Settings</DisplayTitle>

        <Eyebrow>Budget</Eyebrow>
        <View style={{ marginBottom: 16 }}>
          <ListRow
            icon={<DollarSign size={16} color={colors.textSecondary} />}
            title="Currency"
            value={`${settings?.currency ?? 'RD$'} / USD`}
            onPress={() => Alert.alert('Currency', 'RD$ is the default for v1.')}
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
            onPress={() => {}}
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
            onPress={() => Alert.alert('Export', 'Local backup export coming soon.')}
          />
          <ListRow
            icon={<Upload size={16} color={colors.textSecondary} />}
            title="Import backup"
            onPress={() => Alert.alert('Import', 'Local backup import coming soon.')}
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
            value="Dark"
            onPress={() => {}}
          />
          <ListRow
            icon={<Info size={16} color={colors.textSecondary} />}
            title="About NoCap"
            onPress={() => Alert.alert('NoCap', 'Offline-first budgeting. For real.')}
            last
          />
        </View>
      </ScrollView>
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
});
