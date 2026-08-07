import { View, Text, TextInput, Switch, StyleSheet, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Lock } from 'lucide-react-native';
import { Screen, Eyebrow, DisplayTitle, BodySm, Card } from '@/src/components';
import { ButtonPrimary } from '@/src/components/Buttons';
import { useOnboarding } from '@/src/hooks/OnboardingContext';
import { colors, typography } from '@/src/theme/theme';

export default function PermissionsScreen() {
  const router = useRouter();
  const { displayName, setDisplayName, aiConsent, setAiConsent } = useOnboarding();

  const onContinue = () => {
    if (!displayName.trim()) {
      Alert.alert('Name required', 'Enter the name we’ll use on your Home greeting.');
      return;
    }
    router.push('/onboarding/templates');
  };

  return (
    <Screen edges={['top', 'bottom']} style={{ paddingTop: 20 }} padded={false}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Eyebrow>Step 1 of 3</Eyebrow>
        <DisplayTitle style={{ fontSize: 21, marginBottom: 6 }}>Your data, your call</DisplayTitle>
        <BodySm style={{ marginBottom: 22 }}>
          NoCap stores everything on this device only. Nothing leaves your phone unless you turn this
          on.
        </BodySm>

        <Text style={styles.label}>Display name</Text>
        <TextInput
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="e.g. Alex"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="words"
          autoCorrect={false}
          style={styles.input}
          accessibilityLabel="Display name"
        />
        <BodySm style={{ color: colors.textMuted, marginBottom: 18 }}>
          Used for the Home greeting. You can change it later in Settings.
        </BodySm>

        <Card style={{ marginBottom: 12 }}>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>On-device insights</Text>
              <BodySm>Cap alerts and local trends. Always on this device.</BodySm>
            </View>
            <Lock size={16} color={colors.teal[700]} style={{ marginTop: 2 }} />
          </View>
        </Card>

        <Card style={{ marginBottom: 12, borderColor: colors.gold[300] }}>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Conversational AI advice</Text>
              <BodySm>
                Optional, off by default. Requires an internet connection when you use chat advice.
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
          You can change privacy settings anytime in Settings.
        </BodySm>

        <View style={{ flex: 1, minHeight: 24 }} />
        <ButtonPrimary
          label="Continue"
          onPress={onContinue}
          disabled={!displayName.trim()}
          style={{ marginBottom: 10 }}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  label: {
    fontFamily: typography.uiBold,
    fontSize: 11,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: colors.textMuted,
    marginBottom: 6,
  },
  input: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    color: colors.textPrimary,
    paddingHorizontal: 12,
    fontFamily: typography.ui,
    fontSize: 14,
    marginBottom: 8,
  },
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
