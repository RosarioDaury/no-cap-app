import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Circle } from 'react-native-svg';
import { Screen, DisplayTitle, BodySm } from '@/src/components';
import { ButtonPrimary, ButtonGhost } from '@/src/components/Buttons';
import { colors, typography } from '@/src/theme/theme';

function LogoRings() {
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
        <ButtonGhost label="Import a backup" onPress={() => {}} />
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
