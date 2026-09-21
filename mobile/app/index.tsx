import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useDb } from '@/src/hooks/DbProvider';
import { useTheme } from '@/src/hooks/ThemeProvider';

export default function Index() {
  const { ready, settings } = useDb();
  const { colors } = useTheme();
  if (!ready || !settings) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bgApp, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.teal[500]} />
      </View>
    );
  }
  if (!settings.onboardingComplete) {
    return <Redirect href="/onboarding/welcome" />;
  }
  return <Redirect href="/(tabs)" />;
}
