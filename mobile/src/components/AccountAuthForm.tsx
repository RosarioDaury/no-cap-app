import { useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, Platform, Pressable } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { ButtonPrimary } from '@/src/components/Buttons';
import { Chip } from '@/src/components/Chip';
import { useAuth, ApiError } from '@/src/hooks/AuthProvider';
import { useDb } from '@/src/hooks/DbProvider';
import { useOnline } from '@/src/hooks/useOnline';
import { useTheme } from '@/src/hooks/ThemeProvider';
import { ThemeColors, typography } from '@/src/theme/theme';
import { checkAvailability, Gender } from '@/src/api/client';
import { formatShortDate } from '@/src/lib/format';

type AccountAuthFormProps = {
  mode: 'login' | 'register';
  onSuccess: () => void;
};

const USERNAME_RE = /^[a-z0-9_]{3,24}$/;

const GENDERS: { id: Gender; label: string }[] = [
  { id: 'female', label: 'Female' },
  { id: 'male', label: 'Male' },
  { id: 'non_binary', label: 'Non-binary' },
  { id: 'prefer_not', label: 'Prefer not' },
  { id: 'other', label: 'Other' },
];

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function fromISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

function yearsAgo(n: number): Date {
  const d = new Date();
  d.setFullYear(d.getFullYear() - n);
  return d;
}

function isAtLeast13(iso: string): boolean {
  return fromISODate(iso) <= yearsAgo(13);
}

export function AccountAuthForm({ mode, onSuccess }: AccountAuthFormProps) {
  const { signIn, signUp } = useAuth();
  const { setSetting } = useDb();
  const { colors, mode: themeMode } = useTheme();
  const online = useOnline();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [identifier, setIdentifier] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [gender, setGender] = useState<Gender | null>(null);
  const [dob, setDob] = useState(toISODate(yearsAgo(18)));
  const [showDob, setShowDob] = useState(false);
  const [usernameTaken, setUsernameTaken] = useState<boolean | null>(null);
  const [emailTaken, setEmailTaken] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (mode !== 'register' || !online) {
      setUsernameTaken(null);
      setEmailTaken(null);
      return;
    }
    const name = username.trim().toLowerCase();
    const mail = email.trim().toLowerCase();
    const handle = setTimeout(() => {
      const query: { username?: string; email?: string } = {};
      if (USERNAME_RE.test(name)) query.username = name;
      if (mail.includes('@')) query.email = mail;
      if (!query.username && !query.email) {
        setUsernameTaken(null);
        setEmailTaken(null);
        return;
      }
      checkAvailability(query)
        .then((res) => {
          setUsernameTaken(query.username ? !!res.username_taken : null);
          setEmailTaken(query.email ? !!res.email_taken : null);
        })
        .catch(() => {
          /* availability is a hint; submit still validates */
        });
    }, 400);
    return () => clearTimeout(handle);
  }, [username, email, mode, online]);

  const onDobChange = (_event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS !== 'ios') setShowDob(false);
    if (selected) setDob(toISODate(selected));
  };

  const onSubmit = async () => {
    if (!online) {
      Alert.alert('Offline', 'Accounts live on the server. Connect to the internet to continue.');
      return;
    }
    if (password.length < 8) {
      Alert.alert('Password', 'Use at least 8 characters.');
      return;
    }
    if (mode === 'register') {
      const name = username.trim().toLowerCase();
      const mail = email.trim().toLowerCase();
      if (!USERNAME_RE.test(name)) {
        Alert.alert('Username', 'Use 3–24 letters, numbers, or underscore.');
        return;
      }
      if (!mail.includes('@')) {
        Alert.alert('Email required', 'Use the email for this NoCap account.');
        return;
      }
      if (!gender) {
        Alert.alert('Gender', 'Pick an option, including Prefer not.');
        return;
      }
      if (!isAtLeast13(dob)) {
        Alert.alert('Date of birth', 'You must be at least 13.');
        return;
      }
      if (usernameTaken) {
        Alert.alert('Username taken', 'Choose a different username.');
        return;
      }
      if (emailTaken) {
        Alert.alert('Email taken', 'That email already has an account. Sign in instead.');
        return;
      }
    } else if (!identifier.trim()) {
      Alert.alert('Sign in', 'Enter your username or email.');
      return;
    }
    setBusy(true);
    try {
      if (mode === 'register') {
        await signUp({
          username: username.trim().toLowerCase(),
          email: email.trim().toLowerCase(),
          password,
          gender: gender as Gender,
          date_of_birth: dob,
        });
      } else {
        await signIn(identifier.trim(), password);
      }
      await setSetting({ aiConsent: 1 });
      onSuccess();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Try again.';
      Alert.alert(mode === 'register' ? 'Could not create account' : 'Could not sign in', message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View>
      {!online ? (
        <Text style={styles.offline}>Connect to the internet to {mode === 'register' ? 'register' : 'sign in'}.</Text>
      ) : null}

      {mode === 'register' ? (
        <>
          <Text style={styles.label}>Username</Text>
          <TextInput
            value={username}
            onChangeText={setUsername}
            placeholder="nocap_user"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="username"
            textContentType="username"
            accessibilityLabel="Username"
            style={styles.input}
          />
          {usernameTaken === true ? <Text style={styles.warn}>That username is taken.</Text> : null}
          {usernameTaken === false ? <Text style={styles.ok}>Username is available.</Text> : null}

          <Text style={styles.label}>Email</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="you@email.com"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
            accessibilityLabel="Email"
            style={styles.input}
          />
          {emailTaken === true ? <Text style={styles.warn}>That email is already registered.</Text> : null}
          {emailTaken === false ? <Text style={styles.ok}>Email is available.</Text> : null}

          <Text style={styles.label}>Gender</Text>
          <View style={styles.chips}>
            {GENDERS.map((option) => (
              <Chip
                key={option.id}
                label={option.label}
                selected={gender === option.id}
                onPress={() => setGender(option.id)}
              />
            ))}
          </View>

          <Text style={styles.label}>Date of birth</Text>
          {Platform.OS === 'web' ? (
            <TextInput
              value={dob}
              onChangeText={setDob}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              accessibilityLabel="Date of birth"
              style={styles.input}
            />
          ) : (
            <>
              <Pressable onPress={() => setShowDob((v) => !v)} style={styles.dobBtn}>
                <Text style={styles.dobText}>{formatShortDate(dob)}</Text>
                <Text style={styles.dobHint}>Change</Text>
              </Pressable>
              {showDob ? (
                <View style={styles.pickerWrap}>
                  <DateTimePicker
                    value={fromISODate(dob)}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={onDobChange}
                    maximumDate={yearsAgo(13)}
                    minimumDate={new Date(1900, 0, 1)}
                    themeVariant={themeMode === 'light' ? 'light' : 'dark'}
                  />
                  {Platform.OS === 'ios' ? (
                    <ButtonPrimary label="Done" compact onPress={() => setShowDob(false)} />
                  ) : null}
                </View>
              ) : null}
            </>
          )}
        </>
      ) : (
        <>
          <Text style={styles.label}>Username or email</Text>
          <TextInput
            value={identifier}
            onChangeText={setIdentifier}
            placeholder="username or you@email.com"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="username"
            textContentType="username"
            accessibilityLabel="Username or email"
            style={styles.input}
          />
        </>
      )}

      <Text style={styles.label}>Password</Text>
      <TextInput
        value={password}
        onChangeText={setPassword}
        placeholder="At least 8 characters"
        placeholderTextColor={colors.textMuted}
        autoComplete={mode === 'register' ? 'new-password' : 'password'}
        textContentType={mode === 'register' ? 'newPassword' : 'password'}
        secureTextEntry
        accessibilityLabel="Password"
        style={styles.input}
        onSubmitEditing={() => {
          void onSubmit();
        }}
        returnKeyType="go"
      />
      <ButtonPrimary
        label={mode === 'register' ? 'Create account' : 'Sign in'}
        loading={busy}
        disabled={!online}
        onPress={() => {
          void onSubmit();
        }}
      />
    </View>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    label: {
      fontFamily: typography.uiBold,
      fontSize: 11,
      letterSpacing: 0.4,
      textTransform: 'uppercase',
      color: colors.textMuted,
      marginBottom: 6,
    },
    input: {
      height: 48,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceAlt,
      color: colors.textPrimary,
      paddingHorizontal: 14,
      fontFamily: typography.ui,
      fontSize: 15,
      marginBottom: 16,
    },
    chips: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 16,
    },
    dobBtn: {
      height: 48,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceAlt,
      paddingHorizontal: 14,
      marginBottom: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    dobText: {
      fontFamily: typography.ui,
      fontSize: 15,
      color: colors.textPrimary,
    },
    dobHint: {
      fontFamily: typography.uiSemiBold,
      fontSize: 13,
      color: colors.teal[300],
    },
    pickerWrap: {
      marginTop: -8,
      marginBottom: 16,
    },
    warn: {
      fontFamily: typography.ui,
      fontSize: 12,
      color: colors.coral[300],
      marginTop: -10,
      marginBottom: 12,
    },
    ok: {
      fontFamily: typography.ui,
      fontSize: 12,
      color: colors.teal[300],
      marginTop: -10,
      marginBottom: 12,
    },
    offline: {
      fontFamily: typography.ui,
      fontSize: 13,
      color: colors.gold[300],
      marginBottom: 16,
    },
  });
}
