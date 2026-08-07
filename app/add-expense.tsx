import { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { X, Calendar } from 'lucide-react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import {
  Screen,
  Eyebrow,
  SectionTitle,
  Chip,
  ButtonPrimary,
  IconButton,
  Card,
} from '@/src/components';
import { useDb } from '@/src/hooks/DbProvider';
import { useTheme } from '@/src/hooks/ThemeProvider';
import { formatMoney, formatShortDate, parseMoneyInput, todayISO } from '@/src/lib/format';
import { ThemeColors, typography } from '@/src/theme/theme';

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function fromISODate(iso: string): Date {
  return new Date(`${iso}T12:00:00`);
}

function dateLabel(iso: string): string {
  if (iso === todayISO()) return `Today, ${formatShortDate(iso)}`;
  return formatShortDate(iso);
}

export default function AddExpenseModal() {
  const router = useRouter();
  const { categories, settings, logExpense } = useDb();
  const { colors, mode } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const currency = settings?.currency ?? 'RD$';
  const [amountRaw, setAmountRaw] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(categories[0]?.id ?? null);
  const [note, setNote] = useState('');
  const [dateISO, setDateISO] = useState(todayISO());
  const [showPicker, setShowPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const amountCents = useMemo(() => parseMoneyInput(amountRaw), [amountRaw]);

  const onDateChange = (_event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
    }
    if (selected) {
      setDateISO(toISODate(selected));
    }
  };

  const onSubmit = async () => {
    if (!categoryId) {
      setError('Pick a category');
      return;
    }
    if (amountCents <= 0) {
      setError('Enter an amount');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await logExpense({
        categoryId,
        amountCents,
        note,
        date: dateISO,
      });
      router.back();
    } catch {
      setError('Could not save expense');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen edges={['top', 'bottom']} padded={false}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.topbar}>
          <IconButton onPress={() => router.back()}>
            <X size={16} color={colors.textSecondary} />
          </IconButton>
          <Text style={styles.topTitle}>Log a spend</Text>
          <View style={{ width: 34 }} />
        </View>

        <View style={styles.amountBlock}>
          <Eyebrow style={{ textAlign: 'center' }}>Amount</Eyebrow>
          <TextInput
            value={amountRaw}
            onChangeText={setAmountRaw}
            placeholder={formatMoney(0, currency)}
            placeholderTextColor={colors.textMuted}
            keyboardType="decimal-pad"
            style={styles.amountInput}
          />
        </View>

        <SectionTitle>Category</SectionTitle>
        <View style={styles.chips}>
          {categories.map((c) => (
            <Chip
              key={c.id}
              label={c.name.split(' ')[0]}
              selected={categoryId === c.id}
              onPress={() => setCategoryId(c.id)}
            />
          ))}
        </View>

        <SectionTitle>Note</SectionTitle>
        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="Weekly market run"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
        />

        <SectionTitle>Date</SectionTitle>
        <Pressable onPress={() => setShowPicker((v) => !v)}>
          <Card variant="flat" style={styles.dateRow}>
            <Calendar size={15} color={colors.textMuted} />
            <Text style={styles.dateText}>{dateLabel(dateISO)}</Text>
          </Card>
        </Pressable>

        {showPicker ? (
          <View style={styles.pickerWrap}>
            <DateTimePicker
              value={fromISODate(dateISO)}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onDateChange}
              maximumDate={new Date()}
              themeVariant={mode === 'light' ? 'light' : 'dark'}
            />
            {Platform.OS === 'ios' ? (
              <ButtonPrimary
                label="Done"
                compact
                onPress={() => setShowPicker(false)}
                style={{ marginTop: 8 }}
              />
            ) : null}
          </View>
        ) : null}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={{ flex: 1, minHeight: 24 }} />
        <ButtonPrimary label="Log expense" onPress={onSubmit} loading={loading} style={{ marginBottom: 20 }} />
      </ScrollView>
    </Screen>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    content: {
      paddingHorizontal: 20,
      paddingTop: 8,
      flexGrow: 1,
    },
    topbar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingBottom: 18,
    },
    topTitle: {
      fontFamily: typography.uiSemiBold,
      fontSize: 15,
      color: colors.textPrimary,
      letterSpacing: 0.2,
    },
    amountBlock: {
      alignItems: 'center',
      marginVertical: 14,
      marginBottom: 26,
    },
    amountInput: {
      fontFamily: typography.display,
      fontSize: 40,
      color: colors.teal[300],
      textAlign: 'center',
      minWidth: 180,
    },
    chips: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 20,
    },
    input: {
      height: 38,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceAlt,
      color: colors.textPrimary,
      paddingHorizontal: 12,
      fontFamily: typography.ui,
      fontSize: 13,
      marginBottom: 16,
    },
    dateRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      height: 40,
      paddingVertical: 0,
      paddingHorizontal: 14,
      marginBottom: 12,
    },
    dateText: {
      fontFamily: typography.ui,
      fontSize: 13,
      color: colors.textPrimary,
    },
    pickerWrap: {
      marginBottom: 16,
      backgroundColor: colors.surfaceAlt,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
      paddingBottom: 8,
    },
    error: {
      fontFamily: typography.ui,
      fontSize: 12,
      color: colors.coral[500],
      marginBottom: 8,
    },
  });
}
