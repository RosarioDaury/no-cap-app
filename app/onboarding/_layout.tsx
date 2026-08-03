import { Stack } from 'expo-router';
import { colors } from '@/src/theme/theme';

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bgApp },
        animation: 'slide_from_right',
      }}
    />
  );
}
