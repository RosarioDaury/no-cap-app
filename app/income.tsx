import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { Screen, DisplayTitle, IconButton } from '@/src/components';
import { IncomePane } from '@/src/screens/IncomePane';
import { useTheme } from '@/src/hooks/ThemeProvider';

export default function IncomeScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  return (
    <Screen edges={['top']} padded={false}>
      <View style={styles.topbar}>
        <IconButton onPress={() => router.back()} accessibilityLabel="Go back">
          <ArrowLeft size={16} color={colors.textSecondary} />
        </IconButton>
        <DisplayTitle style={{ fontSize: 17 }}>Income</DisplayTitle>
        <View style={{ width: 36 }} />
      </View>
      <IncomePane />
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
