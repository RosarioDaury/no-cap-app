import { View, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, DisplayTitle, BodySm, BrandMark, OnboardingProgress } from '@/src/components';
import { ButtonPrimary, ButtonGhost } from '@/src/components/Buttons';
import { useDb } from '@/src/hooks/DbProvider';
import { typography } from '@/src/theme/theme';

export default function WelcomeScreen() {
  const router = useRouter();
  const { importBackup } = useDb();

  const onImport = () => {
    Alert.alert(
      'Import a backup?',
      'Restores categories, transactions, goals, and debts from a NoCap JSON backup, then opens the app.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Choose file',
          onPress: () => {
            importBackup()
              .catch((err: unknown) => {
                const message = err instanceof Error ? err.message : 'Invalid or unreadable file.';
                Alert.alert('Import failed', message);
              });
            // On success, RootNavigator routes to tabs once onboardingComplete is set.
          },
        },
      ],
    );
  };

  return (
    <Screen style={styles.screen} edges={['top', 'bottom']}>
      <View />
      <View style={styles.center}>
        <OnboardingProgress step={1} />
        <BrandMark size={88} />
        <DisplayTitle style={styles.brand}>NoCap</DisplayTitle>
        <BodySm style={styles.tagline}>budgeting, for real.</BodySm>
      </View>
      <View style={styles.actions}>
        <ButtonPrimary label="Get started" onPress={() => router.push('/onboarding/permissions')} />
        <ButtonGhost label="Import a backup" onPress={onImport} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingBottom: 40,
  },
  center: {
    alignItems: 'center',
    width: '100%',
  },
  brand: {
    fontSize: 32,
    marginBottom: 8,
    marginTop: 20,
    fontFamily: typography.display,
  },
  tagline: {
    fontSize: 13.5,
    textAlign: 'center',
  },
  actions: {
    width: '100%',
    gap: 10,
  },
});
