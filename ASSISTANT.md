# NoCap assistant — how it works now

This is the current conversational AI path. Budgeting still runs offline on the phone. The API is additive: accounts, saved chats, and a bounded spend snapshot. It does **not** upload the SQLite ledger.

## Split of jobs

| Surface | Where | What |
| --- | --- | --- |
| Insight cards | Phone (`mobile/src/lib/insights.ts`) | Over-cap and threshold warnings. No network. |
| Spend snapshot | Phone (`mobile/src/lib/spendSnapshot.ts`) | Compact JSON of this month’s facts. Built on every send. |
| Account + chats | Server (`backend/`) | User id, conversation id, messages, stored snapshots. |
| Narrative | Server (`backend/app/services/llm.py`) | Answers using **only** the snapshot (+ last 8 messages). |

The model is not allowed to add cents. Arithmetic happens on the device before the request leaves.

## Gates (phone)

Chat is shown only when all of these are true:

1. **Conversational AI** is on in Settings / onboarding (`aiConsent`).
2. The device is **online** (`useAiAvailability`).
3. The user is **signed in** (JWT in SecureStore).

Local cards ignore these gates. Without an account, Insights still shows cap alerts and prompts to sign in.

## What a chat turn does

```
Insights composer
  → buildSpendSnapshot() from SQLite (categories, caps, spend, bills, goals, debts, 6-month totals, facts)
  → POST /v1/assistant/chat
       Authorization: Bearer <jwt>
       { conversation_id?, message, snapshot }
  → FastAPI validates snapshot (Pydantic, max 8 KB)
  → Load or create conversation for this user
  → Store snapshot (deduped by SHA-256 digest per conversation)
  → Load last 8 messages for this conversation
  → LLM (or local fallback if no API key)
  → Persist user + assistant messages
  → Return { conversation_id, snapshot_id, user_id, title, reply }
  → Phone keeps conversation_id so the next send continues the same thread
```

`+` on Insights clears `conversation_id` so the next message starts a new server session.

## Snapshot (v1)

Built on the phone. Money is integer **cents**. Unlimited categories (`cap_cents === 0`) are flagged and excluded from cap totals.

Included:

- `currency`, `as_of`, `month` (`YYYY-MM`), `days_left`
- `income_cents`, `spend_cents`, `capped_spend_cents`, `total_cap_cents`
- Active-this-month categories: id, name, cap, spent, unlimited
- Last ~6 months of total spend and income
- Goals, debts, bills (status, days until due)
- `facts[]`: over-cap, near-cap (user threshold), simple debt-payoff months

Not included (on purpose):

- Full transaction list
- Expense notes
- Display name
- Backup JSON

Schema: `mobile/src/lib/spendSnapshot.ts` and `backend/app/schemas/snapshot.py` (must stay in sync).

## Server identity

| Id prefix | Meaning |
| --- | --- |
| `user_…` | Account |
| `convo_…` | Chat session |
| `msg_…` | One message |
| `snap_…` | One stored snapshot payload |

Auth: `POST /v1/auth/register`, `POST /v1/auth/login`, `GET /v1/auth/me`, `GET /v1/auth/available`. Register collects username, email, gender, and date of birth (13+). Username is unique (`[a-z0-9_]{3,24}`). Email uniqueness uses an HMAC lookup hash so plaintext email is not stored. Gender and date of birth are Fernet-encrypted at rest (`PII_KEY`). Passwords are PBKDF2 hashes. Access tokens are JWT HS256 (`JWT_SECRET`, 14 days) with `sub` + `username` only — use HTTPS in production; the JWT is signed, not a vault for PII.

SQLite tables (`DATABASE_URL`, default `backend/nocap.db`):

- `users` (username plaintext; `email_hash` HMAC; `email_enc` / `gender_enc` / `dob_enc` Fernet; `password_hash` PBKDF2)
- `conversations` (owned by `user_id`; `brief_json` / `focus_json` exist for later memory, unused in the prompt today)
- `messages` (`role` = `user` \| `assistant`)
- `snapshots` (`user_id`, `conversation_id`, `digest`, `payload_json`) — corpus for future RAG

A conversation cannot be read by another user (404).

## LLM

If `LLM_API_KEY` is empty, the server does **not** call a model. It returns a short summary of `facts[]` (or spend vs cap). Useful for wiring.

If the key is set, it POSTs to `{LLM_BASE_URL}/chat/completions` (OpenAI-compatible) with:

- System: cite snapshot only, JSON `{ reply, title }`
- The snapshot JSON
- Last 8 turns
- The new question
- `max_tokens` 600

On HTTP/parse failure it falls back to the same deterministic summary.

## Phone storage

| Key | Where | What |
| --- | --- | --- |
| `nocap.access_token` | SecureStore | JWT |
| `nocap.user` | SecureStore | `{ id, username, email }` cache |
| `nocap.conversation_id` | SecureStore | Active thread |

Budget rows stay in Expo SQLite. Signing out drops the token on this device; chats remain on the server.

API base URL: `EXPO_PUBLIC_API_URL`, else `http://10.0.2.2:8000` on Android emulator, else `http://127.0.0.1:8000`. Physical devices need the LAN IP.

## How to run a turn end-to-end

```bash
cd backend
cp .env.example .env   # set JWT_SECRET and PII_KEY; optional LLM_API_KEY
source .venv/bin/activate
fastapi dev
```

App: Settings → Conversational AI on → NoCap account → Insights → ask.

OpenAPI: http://127.0.0.1:8000/docs

## Not built yet

- RAG over stored snapshots
- Session brief / durable memory in the prompt (`brief_json` is unused)
- Local leftover/afford router (no API)
- Conversation list UI (only current thread + new chat)
- Cloud sync of the on-device ledger

Those can sit on this design: same snapshot contract, same `user_id` / `conversation_id`, retrieve old `snapshots.payload_json` instead of sending more raw spend.
