import { useEffect, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import {
  AccountAuthForm,
  BodySm,
  BrandMark,
  DisplayTitle,
  IconButton,
  KeyboardFormScroll,
  Screen,
} from '@/src/components';
import { ButtonGhost } from '@/src/components/Buttons';
import { useAuth } from '@/src/hooks/AuthProvider';
import { useTheme } from '@/src/hooks/ThemeProvider';
import { ThemeColors } from '@/src/theme/theme';

export default function RegisterScreen() {
  const router = useRouter();
  const { user, ready } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  useEffect(() => {
    if (ready && user) router.replace('/(tabs)');
  }, [ready, user, router]);

  return (
    <Screen edges={['top', 'bottom']} padded={false}>
      <KeyboardFormScroll contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <IconButton onPress={() => router.back()} accessibilityLabel="Go back">
            <ArrowLeft size={16} color={colors.textSecondary} />
          </IconButton>
        </View>
        <BrandMark size={36} />
        <DisplayTitle style={styles.title}>Create account</DisplayTitle>
        <BodySm style={styles.copy}>
          Username, email, gender, and date of birth are stored on the server. You need to be online,
          and username and email must be unique. Budget data still lives on this phone.
        </BodySm>
        <AccountAuthForm mode="register" onSuccess={() => router.replace('/(tabs)')} />
        <View style={{ flex: 1, minHeight: 24 }} />
        <ButtonGhost label="Already have an account" onPress={() => router.replace('/login')} />
      </KeyboardFormScroll>
    </Screen>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    content: {
      flexGrow: 1,
      paddingHorizontal: 20,
      paddingBottom: 20,
    },
    header: {
      marginBottom: 24,
    },
    title: {
      fontSize: 28,
      marginTop: 16,
      marginBottom: 8,
    },
    copy: {
      color: colors.textMuted,
      marginBottom: 28,
    },
  });
}
