import { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, Eyebrow, DisplayTitle, BodySm, Card, BrandMark } from '@/src/components';
import { ButtonPrimary } from '@/src/components/Buttons';
import { useOnboarding } from '@/src/hooks/OnboardingContext';
import { useTheme } from '@/src/hooks/ThemeProvider';
import { BUDGET_TEMPLATES } from '@/src/db/database';
import { ThemeColors, typography } from '@/src/theme/theme';

export default function TemplatesScreen() {
  const router = useRouter();
  const { templateId, setTemplateId } = useOnboarding();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const selected = BUDGET_TEMPLATES.find((t) => t.id === templateId) ?? BUDGET_TEMPLATES[0];

  return (
    <Screen edges={['top', 'bottom']} style={{ paddingTop: 20 }}>
      <BrandMark size={28} />
      <Eyebrow style={{ marginTop: 14 }}>Step 2 of 3</Eyebrow>
      <DisplayTitle style={{ fontSize: 21, marginBottom: 6 }}>Choose a starting method</DisplayTitle>
      <BodySm style={{ marginBottom: 18 }}>We&apos;ll pre-fill your caps — fine-tune every number after.</BodySm>

      <View style={{ gap: 10, flex: 1 }}>
        {BUDGET_TEMPLATES.map((t, i) => {
          const isSelected = t.id === templateId;
          return (
            <Pressable key={t.id} onPress={() => setTemplateId(t.id)}>
              <Card
                variant={i === 0 && isSelected ? 'tint' : 'default'}
                tint="gold"
                style={[
                  isSelected && { borderWidth: 1.5, borderColor: colors.gold[300] },
                ]}
              >
                <View style={styles.header}>
                  <Text style={styles.title}>{t.name}</Text>
                  {i === 0 ? (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>Recommended</Text>
                    </View>
                  ) : null}
                </View>
                <BodySm>{t.description}</BodySm>
              </Card>
            </Pressable>
          );
        })}
      </View>

      <ButtonPrimary
        label={`Use ${selected.name.split(' ')[0]}`}
        onPress={() => router.push('/onboarding/budget-setup')}
        style={{ marginVertical: 16 }}
      />
    </Screen>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 5,
    },
    title: {
      fontFamily: typography.uiSemiBold,
      fontSize: 13,
      color: colors.textPrimary,
    },
    badge: {
      backgroundColor: colors.gold[50],
      paddingHorizontal: 9,
      paddingVertical: 3,
      borderRadius: 10,
    },
    badgeText: {
      fontFamily: typography.uiBold,
      fontSize: 10,
      color: colors.gold[700],
      letterSpacing: 0.2,
    },
  });
}
