import { useMemo } from 'react';
import { Link, Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { ThemeColors, typography } from '@/src/theme/theme';
import { useTheme } from '@/src/hooks/ThemeProvider';

export default function NotFoundScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <>
      <Stack.Screen options={{ title: 'Oops!', headerStyle: { backgroundColor: colors.bgApp }, headerTintColor: colors.textPrimary }} />
      <View style={styles.container}>
        <Text style={styles.title}>This screen doesn&apos;t exist.</Text>
        <Link href="/" style={styles.link}>
          <Text style={styles.linkText}>Go to home</Text>
        </Link>
      </View>
    </>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
      backgroundColor: colors.bgApp,
    },
    title: {
      fontSize: 18,
      fontFamily: typography.uiSemiBold,
      color: colors.textPrimary,
    },
    link: {
      marginTop: 15,
      paddingVertical: 15,
    },
    linkText: {
      fontSize: 14,
      fontFamily: typography.ui,
      color: colors.teal[500],
    },
  });
}
