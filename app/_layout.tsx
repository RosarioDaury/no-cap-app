import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, Image } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  useFonts,
  SpaceGrotesk_500Medium,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
} from '@expo-google-fonts/space-grotesk';
import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
} from '@expo-google-fonts/manrope';
import * as SplashScreen from 'expo-splash-screen';
import { DbProvider, useDb } from '@/src/hooks/DbProvider';
import { OnboardingProvider } from '@/src/hooks/OnboardingContext';
import { ThemeProvider, useTheme } from '@/src/hooks/ThemeProvider';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { darkColors } from '@/src/theme/theme';

export { ErrorBoundary } from 'expo-router';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

function RootNavigator() {
  const { ready, settings } = useDb();
  const { colors, mode } = useTheme();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => undefined);
  }, [ready]);

  useEffect(() => {
    if (!ready || !settings) return;
    const inOnboarding = segments[0] === 'onboarding';
    if (!settings.onboardingComplete && !inOnboarding) {
      router.replace('/onboarding/welcome');
    } else if (settings.onboardingComplete && inOnboarding) {
      router.replace('/(tabs)');
    }
  }, [ready, settings, segments, router]);

  return (
    <>
      <StatusBar style={mode === 'light' ? 'dark' : 'light'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bgApp } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="add-expense" options={{ presentation: 'modal' }} />
        <Stack.Screen name="categories" />
        <Stack.Screen name="category/[id]" />
        <Stack.Screen name="income" />
        <Stack.Screen name="debt" />
        <Stack.Screen name="history" />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    SpaceGrotesk_500Medium,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
  });

  if (!fontsLoaded) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: darkColors.bgApp,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Image
          source={require('../assets/images/lid-off/mark-512-transparent.png')}
          style={{ width: 80, height: 80 }}
          accessibilityLabel="NoCap"
        />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <KeyboardProvider>
        <DbProvider>
          <ThemeProvider>
            <OnboardingProvider>
              <RootNavigator />
            </OnboardingProvider>
          </ThemeProvider>
        </DbProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}
