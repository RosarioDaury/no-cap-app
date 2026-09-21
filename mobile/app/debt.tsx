import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { Screen, DisplayTitle, IconButton } from '@/src/components';
import { DebtPane } from '@/src/screens/DebtPane';
import { useTheme } from '@/src/hooks/ThemeProvider';

export default function DebtScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  return (
    <Screen edges={['top']} padded={false}>
      <View style={styles.topbar}>
        <IconButton onPress={() => router.back()} accessibilityLabel="Go back">
          <ArrowLeft size={16} color={colors.textSecondary} />
        </IconButton>
        <DisplayTitle style={{ fontSize: 17 }}>Debt tracker</DisplayTitle>
        <View style={{ width: 36 }} />
      </View>
      <DebtPane />
    </Screen>
  );
}

const styles = StyleSheet.create({
  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 8,
    paddingTop: 8,
  },
});
