# NoCap backend

FastAPI service for upcoming networked NoCap features (AI, auth, sync). The mobile app in `../mobile` stays offline-first; this API is additive.

Auth, saved chats, and snapshot-based assistant:

- `POST /v1/auth/register` `POST /v1/auth/login` `GET /v1/auth/me` `GET /v1/auth/available`
- `GET /v1/conversations` `GET /v1/conversations/{id}`
- `POST /v1/assistant/chat` (Bearer token + spend snapshot)

Copy `.env.example` and set `JWT_SECRET` plus `PII_KEY`. Set `LLM_API_KEY` to use a model; without it, chat returns a deterministic snapshot summary.

How the snapshot, accounts, and sessions fit together: [`../ASSISTANT.md`](../ASSISTANT.md).

## Setup

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
fastapi dev
```

- API: http://127.0.0.1:8000
- Docs: http://127.0.0.1:8000/docs
- Health: http://127.0.0.1:8000/health
