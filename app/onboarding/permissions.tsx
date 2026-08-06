import { View, Text, Switch, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Lock } from 'lucide-react-native';
import { Screen, Eyebrow, DisplayTitle, BodySm, Card } from '@/src/components';
import { ButtonPrimary } from '@/src/components/Buttons';
import { useOnboarding } from '@/src/hooks/OnboardingContext';
import { colors, typography } from '@/src/theme/theme';

export default function PermissionsScreen() {
  const router = useRouter();
  const { aiConsent, setAiConsent } = useOnboarding();

  return (
    <Screen edges={['top', 'bottom']} style={{ paddingTop: 20 }}>
      <Eyebrow>Step 1 of 3</Eyebrow>
      <DisplayTitle style={{ fontSize: 21, marginBottom: 6 }}>Your data, your call</DisplayTitle>
      <BodySm style={{ marginBottom: 22 }}>
        NoCap stores everything on this device only. Nothing leaves your phone unless you turn this on.
      </BodySm>

      <Card style={{ marginBottom: 12 }}>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>On-device insights</Text>
            <BodySm>Pattern trends and cap projections, calculated locally. Always on.</BodySm>
          </View>
          <Lock size={16} color={colors.teal[700]} style={{ marginTop: 2 }} />
        </View>
      </Card>

      <Card style={{ marginBottom: 12, borderColor: colors.gold[300] }}>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Conversational AI advice</Text>
            <BodySm>
              Sends anonymized spending summaries to generate written advice. Optional, off by default.
            </BodySm>
          </View>
          <Switch
            value={aiConsent}
            onValueChange={setAiConsent}
            trackColor={{ false: colors.surfaceAlt, true: colors.teal[700] }}
            thumbColor={aiConsent ? colors.teal[300] : colors.textMuted}
          />
        </View>
      </Card>

      <BodySm style={{ color: colors.textMuted, marginBottom: 24 }}>
        You can change this anytime in Settings.
      </BodySm>

      <View style={{ flex: 1 }} />
      <ButtonPrimary
        label="Continue"
        onPress={() => router.push('/onboarding/templates')}
        style={{ marginBottom: 10 }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  title: {
    fontFamily: typography.uiSemiBold,
    fontSize: 13,
    color: colors.textPrimary,
    marginBottom: 4,
  },
});
