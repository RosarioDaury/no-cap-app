import { BrandMark } from '@/src/components';
import { useTheme } from '@/src/hooks/ThemeProvider';
import { ThemeColors, glow, type } from '@/src/theme/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { Tabs, useRouter } from 'expo-router';
import { Home, Plus, Sparkles, Target, Wallet } from 'lucide-react-native';
import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function TabIcon({ Icon, focused }: { Icon: typeof Home; focused: boolean }) {
  const { colors } = useTheme();
  return <Icon size={19} color={focused ? colors.teal[500] : colors.textMuted} />;
}

const TAB_BAR_CONTENT = 62;
const FAB_SIZE = 68;

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const tabBarHeight = TAB_BAR_CONTENT + insets.bottom;
  const fabBottom = insets.bottom + (TAB_BAR_CONTENT - FAB_SIZE) / 2;

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarShowLabel: true,
          tabBarHideOnKeyboard: true,
          tabBarActiveTintColor: colors.teal[500],
          tabBarInactiveTintColor: colors.textMuted,
          tabBarLabelStyle: {
            ...type.tab,
            textTransform: 'uppercase',
          },
          tabBarStyle: {
            backgroundColor: colors.bgApp,
            borderTopColor: colors.border,
            borderTopWidth: 1,
            height: tabBarHeight,
            paddingTop: 8,
            paddingBottom: Math.max(insets.bottom, 10),
            paddingHorizontal: 8,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarAccessibilityLabel: 'Home',
            tabBarIcon: ({ focused }) => (
              <BrandMark size={19} mono ink={focused ? colors.teal[500] : colors.textMuted} />
            ),
          }}
        />
        <Tabs.Screen
          name="money"
          options={{
            title: 'Money',
            tabBarAccessibilityLabel: 'Money',
            tabBarIcon: ({ focused }) => <TabIcon Icon={Wallet} focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="add"
          options={{
            title: '',
            tabBarLabel: () => null,
            tabBarAccessibilityLabel: 'Add expense spacer',
            tabBarButton: () => <View style={styles.spacer} />,
          }}
        />
        <Tabs.Screen
          name="goals"
          options={{
            title: 'Goals',
            tabBarAccessibilityLabel: 'Goals',
            tabBarIcon: ({ focused }) => <TabIcon Icon={Target} focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="insights"
          options={{
            title: 'Insights',
            tabBarAccessibilityLabel: 'Insights',
            tabBarIcon: ({ focused }) => <TabIcon Icon={Sparkles} focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            href: null,
            title: 'Settings',
          }}
        />
      </Tabs>
      <Pressable
        onPress={() => router.push('/add-expense')}
        accessibilityRole="button"
        accessibilityLabel="Add expense"
        style={[styles.fab, { bottom: fabBottom + 20 }, glow.teal]}
      >
        <LinearGradient
          colors={[colors.teal[300], colors.teal[700]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.fabFill}
        >
          <Plus size={30} color="#04262b" strokeWidth={2.4} />
        </LinearGradient>
      </Pressable>
    </View>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    spacer: {
      width: FAB_SIZE,
    },
    fab: {
      position: 'absolute',
      left: '50%',
      width: FAB_SIZE,
      height: FAB_SIZE,
      marginLeft: -FAB_SIZE / 2,
      borderRadius: FAB_SIZE / 2,
    },
    fabFill: {
      width: FAB_SIZE,
      height: FAB_SIZE,
      borderRadius: FAB_SIZE / 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
}
