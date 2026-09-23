import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Delete, Pencil } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import {
  KeyboardSheet,
  Chip,
  ButtonPrimary,
  CategoryIcon,
} from '@/src/components';
import { useDb } from '@/src/hooks/DbProvider';
import { useTheme } from '@/src/hooks/ThemeProvider';
import { formatMoney, hasMonthlyCap, parseMoneyInput, todayISO } from '@/src/lib/format';
import { listTransactions } from '@/src/db/repositories';
import { ThemeColors, glow, type } from '@/src/theme/theme';

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function fromISODate(iso: string): Date {
  return new Date(`${iso}T12:00:00`);
}

function compactDate(iso: string): string {
  const d = fromISODate(iso);
  const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return iso === todayISO() ? `Today, ${label}` : label;
}

function appendKey(raw: string, key: string): string {
  if (key === 'del') return raw.slice(0, -1);
  if (key === '.') {
    if (raw.includes('.')) return raw;
    return raw ? `${raw}.` : '0.';
  }
  const parts = raw.split('.');
  if (parts[1] !== undefined && parts[1].length >= 2) return raw;
  if (raw === '0') return key;
  return raw + key;
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'del'] as const;

export default function AddExpenseModal() {
  const router = useRouter();
  const { categories, settings, logExpense } = useDb();
  const { colors, mode } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const currency = settings?.currency ?? 'RD$';
  const [raw, setRaw] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(categories[0]?.id ?? null);
  const [note, setNote] = useState('');
  const [noteOpen, setNoteOpen] = useState(false);
  const [dateISO, setDateISO] = useState(todayISO());
  const [showPicker, setShowPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recentIds, setRecentIds] = useState<string[]>([]);

  const amountCents = useMemo(() => parseMoneyInput(raw), [raw]);
  const selected = categories.find((c) => c.id === categoryId);
  const leftover =
    selected && hasMonthlyCap(selected.capCents)
      ? selected.capCents - selected.spentCents - amountCents
      : null;

  const ordered = useMemo(() => {
    const recent = recentIds
      .map((id) => categories.find((c) => c.id === id))
      .filter((c): c is (typeof categories)[number] => !!c);
    const rest = categories.filter((c) => !recentIds.includes(c.id));
    return [...recent, ...rest];
  }, [categories, recentIds]);

  useEffect(() => {
    let cancelled = false;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    const cutoffISO = cutoff.toISOString().slice(0, 10);
    listTransactions({ type: 'expense', limit: 200 })
      .then((txns) => {
        if (cancelled) return;
        const ids: string[] = [];
        for (const t of txns) {
          if (t.date < cutoffISO || !t.categoryId) continue;
          if (!ids.includes(t.categoryId)) ids.push(t.categoryId);
        }
        setRecentIds(ids);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const onDateChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShowPicker(false);
    if (selectedDate) setDateISO(toISODate(selectedDate));
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
    <KeyboardSheet visible onRequestClose={() => router.back()} scroll>
      <View style={styles.grabber} />
      <View style={styles.topRow}>
        <Text style={styles.eyebrow}>Log a spend</Text>
        <Pressable onPress={() => setShowPicker((v) => !v)} hitSlop={8}>
          <Text style={styles.dateLink}>{compactDate(dateISO)} · change</Text>
        </Pressable>
      </View>

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
            <ButtonPrimary label="Done" compact onPress={() => setShowPicker(false)} />
          ) : null}
        </View>
      ) : null}

      <Text style={styles.amount}>{formatMoney(amountCents, currency)}</Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
      >
        {ordered.map((c) => {
          const selectedChip = categoryId === c.id;
          return (
            <Chip
              key={c.id}
              label={c.name.split(' ')[0]}
              selected={selectedChip}
              onPress={() => setCategoryId(c.id)}
              icon={
                <CategoryIcon
                  name={c.icon}
                  tint={selectedChip ? 'teal' : c.tint}
                  size={14}
                  shade={500}
                />
              }
            />
          );
        })}
      </ScrollView>

      <View style={styles.keypad}>
        {KEYS.map((key) => (
          <Pressable
            key={key}
            onPress={() => {
              setRaw((prev) => appendKey(prev, key));
              setError(null);
            }}
            style={({ pressed }) => [styles.key, { opacity: pressed ? 0.7 : 1 }]}
            accessibilityRole="button"
            accessibilityLabel={key === 'del' ? 'Delete' : key}
          >
            {key === 'del' ? (
              <Delete size={20} color={colors.textPrimary} />
            ) : (
              <Text style={styles.keyText}>{key}</Text>
            )}
          </Pressable>
        ))}
      </View>

      {noteOpen ? (
        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="Add a note (optional)"
          placeholderTextColor={colors.textMuted}
          style={styles.noteInput}
          autoFocus
        />
      ) : (
        <Pressable onPress={() => setNoteOpen(true)} style={styles.noteRow}>
          <Pencil size={14} color={colors.textMuted} />
          <Text style={styles.notePlaceholder}>
            {note || 'Add a note (optional)'}
          </Text>
        </Pressable>
      )}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable
        onPress={onSubmit}
        disabled={loading}
        style={({ pressed }) => [{ opacity: pressed || loading ? 0.8 : 1 }, glow.teal]}
      >
        <LinearGradient
          colors={[colors.teal[300], colors.teal[700]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.cta}
        >
          <Text style={styles.ctaText}>
            {selected
              ? `Log ${formatMoney(amountCents, currency)} to ${selected.name}`
              : 'Log spend'}
          </Text>
        </LinearGradient>
      </Pressable>

      {selected && leftover == null && !hasMonthlyCap(selected.capCents) ? (
        <Text style={styles.footer}>No limit on {selected.name}</Text>
      ) : selected && leftover != null ? (
        <Text style={[styles.footer, leftover < 0 && { color: colors.coral[500] }]}>
          {leftover < 0
            ? `Puts ${selected.name} ${formatMoney(Math.abs(leftover), currency)} over`
            : `Leaves ${formatMoney(leftover, currency)} in ${selected.name} this month`}
        </Text>
      ) : null}
    </KeyboardSheet>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    grabber: {
      width: 38,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
      alignSelf: 'center',
      marginBottom: 14,
    },
    topRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    eyebrow: {
      ...type.eyebrow,
      color: colors.textMuted,
      marginBottom: 0,
    },
    dateLink: {
      ...type.meta,
      color: colors.textSecondary,
    },
    amount: {
      fontFamily: type.hero.fontFamily,
      fontSize: 50,
      letterSpacing: -1.5,
      color: colors.teal[300],
      textAlign: 'center',
      marginVertical: 10,
    },
    chips: {
      gap: 8,
      paddingBottom: 14,
    },
    keypad: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 9,
      marginBottom: 12,
    },
    key: {
      width: '31.5%',
      height: 52,
      borderRadius: 14,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    keyText: {
      fontFamily: type.display.fontFamily,
      fontSize: 22,
      color: colors.textPrimary,
    },
    noteRow: {
      height: 40,
      borderRadius: 14,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 12,
      marginBottom: 12,
    },
    notePlaceholder: {
      ...type.body,
      color: colors.textMuted,
    },
    noteInput: {
      height: 40,
      borderRadius: 14,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      color: colors.textPrimary,
      paddingHorizontal: 12,
      fontFamily: type.body.fontFamily,
      fontSize: 13,
      marginBottom: 12,
    },
    error: {
      ...type.meta,
      color: colors.coral[500],
      marginBottom: 8,
    },
    cta: {
      height: 54,
      borderRadius: 999,
      alignItems: 'center',
      justifyContent: 'center',
    },
    ctaText: {
      fontFamily: type.rowTitle.fontFamily,
      fontSize: 14,
      color: '#04262b',
    },
    footer: {
      ...type.meta,
      color: colors.textMuted,
      textAlign: 'center',
      marginTop: 10,
    },
    pickerWrap: {
      marginBottom: 10,
      backgroundColor: colors.surfaceAlt,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
      paddingBottom: 8,
    },
  });
}
