import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import {
  ApiError,
  AuthUser,
  RegisterInput,
  fetchMe,
  loginAccount,
  registerAccount,
} from '@/src/api/client';

const TOKEN_KEY = 'nocap.access_token';
const CONVO_KEY = 'nocap.conversation_id';
const USER_KEY = 'nocap.user';

type AuthContextValue = {
  ready: boolean;
  user: AuthUser | null;
  token: string | null;
  conversationId: string | null;
  signIn: (identifier: string, password: string) => Promise<void>;
  signUp: (input: RegisterInput) => Promise<void>;
  signOut: () => Promise<void>;
  setConversationId: (id: string | null) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function readSecret(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    try {
      return globalThis.localStorage?.getItem(key) ?? null;
    } catch {
      return null;
    }
  }
  return SecureStore.getItemAsync(key);
}

async function writeSecret(key: string, value: string | null): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      if (value == null) globalThis.localStorage?.removeItem(key);
      else globalThis.localStorage?.setItem(key, value);
    } catch {
      /* ignore */
    }
    return;
  }
  if (value == null) await SecureStore.deleteItemAsync(key);
  else await SecureStore.setItemAsync(key, value);
}

function toAuthUser(input: {
  id?: string;
  user_id?: string;
  email: string;
  username?: string;
}): AuthUser {
  return {
    id: input.id || input.user_id || '',
    email: input.email,
    username: input.username || input.email.split('@')[0] || 'user',
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [conversationId, setConversationIdState] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const stored = await readSecret(TOKEN_KEY);
      const convo = await readSecret(CONVO_KEY);
      const cachedUser = await readSecret(USER_KEY);
      setConversationIdState(convo);
      if (stored) {
        try {
          const me = await fetchMe(stored);
          const next = toAuthUser(me);
          setToken(stored);
          setUser(next);
          await writeSecret(USER_KEY, JSON.stringify(next));
        } catch (err) {
          if (err instanceof ApiError && (err.status === 401 || err.status === 404)) {
            await writeSecret(TOKEN_KEY, null);
            await writeSecret(CONVO_KEY, null);
            await writeSecret(USER_KEY, null);
          } else {
            setToken(stored);
            if (cachedUser) {
              try {
                setUser(toAuthUser(JSON.parse(cachedUser) as AuthUser));
              } catch {
                /* ignore */
              }
            }
          }
        }
      }
      setReady(true);
    })().catch(() => setReady(true));
  }, []);

  const applyToken = useCallback(async (access: string, next: AuthUser) => {
    await writeSecret(TOKEN_KEY, access);
    await writeSecret(USER_KEY, JSON.stringify(next));
    setToken(access);
    setUser(next);
  }, []);

  const signIn = useCallback(
    async (identifier: string, password: string) => {
      const res = await loginAccount(identifier.trim(), password);
      await applyToken(res.access_token, toAuthUser(res));
    },
    [applyToken],
  );

  const signUp = useCallback(
    async (input: RegisterInput) => {
      const res = await registerAccount(input);
      await applyToken(res.access_token, toAuthUser(res));
    },
    [applyToken],
  );

  const signOut = useCallback(async () => {
    await writeSecret(TOKEN_KEY, null);
    await writeSecret(CONVO_KEY, null);
    await writeSecret(USER_KEY, null);
    setToken(null);
    setUser(null);
    setConversationIdState(null);
  }, []);

  const setConversationId = useCallback(async (id: string | null) => {
    setConversationIdState(id);
    await writeSecret(CONVO_KEY, id);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      ready,
      user,
      token,
      conversationId,
      signIn,
      signUp,
      signOut,
      setConversationId,
    }),
    [ready, user, token, conversationId, signIn, signUp, signOut, setConversationId],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export { ApiError };
