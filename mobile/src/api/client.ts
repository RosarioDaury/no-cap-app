import { Platform } from 'react-native';
import { SpendSnapshotV1 } from '@/src/lib/spendSnapshot';

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function apiBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  if (Platform.OS === 'android') return 'http://10.0.2.2:8000';
  return 'http://127.0.0.1:8000';
}

export type Gender = 'female' | 'male' | 'non_binary' | 'prefer_not' | 'other';

export type AuthUser = { id: string; username: string; email: string };

export type TokenResponse = {
  access_token: string;
  token_type: string;
  user_id: string;
  username: string;
  email: string;
};

export type MeResponse = {
  id: string;
  username: string;
  email: string;
  gender: Gender;
  date_of_birth: string;
};

export type RegisterInput = {
  username: string;
  email: string;
  password: string;
  gender: Gender;
  date_of_birth: string;
};

export type AvailabilityResponse = {
  username_taken: boolean | null;
  email_taken: boolean | null;
};

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant' | string;
  body: string;
  created_at: string;
};

export type ConversationSummary = {
  id: string;
  title: string;
  updated_at: string;
  message_count: number;
};

export type ConversationDetail = {
  id: string;
  title: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  messages: ChatMessage[];
};

export type ChatResponse = {
  conversation_id: string;
  user_id: string;
  message_id: string;
  snapshot_id: string;
  title: string;
  reply: string;
};

async function request<T>(
  path: string,
  opts: { method?: string; token?: string | null; body?: unknown } = {},
): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`;
  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl()}${path}`, {
      method: opts.method ?? 'GET',
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'Cannot reach the NoCap API. Is the backend running?');
  }
  const text = await response.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { detail: text };
    }
  }
  if (!response.ok) {
    const raw =
      data && typeof data === 'object' && 'detail' in data
        ? (data as { detail: unknown }).detail
        : null;
    const detail =
      typeof raw === 'string'
        ? raw
        : Array.isArray(raw)
          ? raw
              .map((item) =>
                item && typeof item === 'object' && 'msg' in item
                  ? String((item as { msg: unknown }).msg)
                  : JSON.stringify(item),
              )
              .join('; ')
          : `Request failed (${response.status})`;
    throw new ApiError(response.status, detail);
  }
  return data as T;
}

export function registerAccount(input: RegisterInput) {
  return request<TokenResponse>('/v1/auth/register', {
    method: 'POST',
    body: input,
  });
}

export function loginAccount(identifier: string, password: string) {
  return request<TokenResponse>('/v1/auth/login', {
    method: 'POST',
    body: { identifier, password },
  });
}

export function checkAvailability(query: { username?: string; email?: string }) {
  const params = new URLSearchParams();
  if (query.username) params.set('username', query.username);
  if (query.email) params.set('email', query.email);
  return request<AvailabilityResponse>(`/v1/auth/available?${params.toString()}`);
}

export function fetchMe(token: string) {
  return request<MeResponse>('/v1/auth/me', { token });
}

export function listConversations(token: string) {
  return request<ConversationSummary[]>('/v1/conversations', { token });
}

export function getConversation(token: string, id: string) {
  return request<ConversationDetail>(`/v1/conversations/${id}`, { token });
}

export function sendChat(
  token: string,
  input: { conversationId?: string | null; message: string; snapshot: SpendSnapshotV1 },
) {
  return request<ChatResponse>('/v1/assistant/chat', {
    method: 'POST',
    token,
    body: {
      conversation_id: input.conversationId ?? null,
      message: input.message,
      snapshot: input.snapshot,
    },
  });
}
