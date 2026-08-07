import { View, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Circle } from 'react-native-svg';
import { Screen, DisplayTitle, BodySm } from '@/src/components';
import { ButtonPrimary, ButtonGhost } from '@/src/components/Buttons';
import { useDb } from '@/src/hooks/DbProvider';
import { useTheme } from '@/src/hooks/ThemeProvider';
import { typography } from '@/src/theme/theme';

function LogoRings() {
  const { colors } = useTheme();

  return (
    <Svg width={120} height={46} style={{ marginBottom: 28 }}>
      <Circle cx={23} cy={23} r={20} fill="none" stroke={colors.border} strokeWidth={3} />
      <Circle
        cx={23}
        cy={23}
        r={20}
        fill="none"
        stroke={colors.gold[300]}
        strokeWidth={3}
        strokeDasharray="65 126"
        strokeLinecap="round"
        transform="rotate(-90 23 23)"
      />
      <Circle cx={61} cy={23} r={20} fill="none" stroke={colors.border} strokeWidth={3} />
      <Circle
        cx={61}
        cy={23}
        r={20}
        fill="none"
        stroke={colors.teal[700]}
        strokeWidth={3}
        strokeDasharray="45 126"
        strokeLinecap="round"
        transform="rotate(-90 61 23)"
      />
      <Circle cx={97} cy={23} r={20} fill="none" stroke={colors.border} strokeWidth={3} />
      <Circle
        cx={97}
        cy={23}
        r={20}
        fill="none"
        stroke={colors.plum[500]}
        strokeWidth={3}
        strokeDasharray="90 126"
        strokeLinecap="round"
        transform="rotate(-90 97 23)"
      />
    </Svg>
  );
}

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
        <LogoRings />
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
  },
  brand: {
    fontSize: 32,
    marginBottom: 8,
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
