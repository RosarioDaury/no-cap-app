import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { Screen, DisplayTitle, IconButton } from '@/src/components';
import { TrendsPane } from '@/src/screens/TrendsPane';
import { useTheme } from '@/src/hooks/ThemeProvider';

export default function HistoryScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  return (
    <Screen edges={['top']} padded={false}>
      <View style={styles.topbar}>
        <IconButton onPress={() => router.back()} accessibilityLabel="Go back">
          <ArrowLeft size={16} color={colors.textSecondary} />
        </IconButton>
        <DisplayTitle style={{ fontSize: 17 }}>History & trends</DisplayTitle>
        <View style={{ width: 36 }} />
      </View>
      <TrendsPane />
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
