# NoCap backend — agent instructions

FastAPI modular monolith. All server-side features belong in this package.

## Layout

| Path | Owns |
|------|------|
| `app/main.py` | FastAPI app instance, middleware, router includes |
| `app/core/` | Settings, DB session, JWT |
| `app/api/` | HTTP routes (`auth`, `conversations`, `assistant`, `health`) |
| `app/schemas/` | Pydantic request/response models |
| `app/services/` | Chat + LLM |
| `app/models.py` | Users, conversations, messages, snapshots |
| `migrations/` | Postgres schema migrations (Alembic) |
| `tests/` | API tests (SQLite) |

When a feature outgrows a single route file, add `app/services/` and `app/schemas/` — do not start a second app.

## Commands

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
docker compose up -d
fastapi dev
```

Postgres is required for the API. Tests override `DATABASE_URL` to SQLite. After model changes, add an Alembic revision — do not hand-edit live tables.

API docs: http://127.0.0.1:8000/docs

## Conventions

- Pydantic models for request/response bodies.
- Settings via `pydantic-settings` and `.env` (see `.env.example`).
- Keep money as integer cents if it is persisted later, matching the mobile app.

Assistant / snapshot behavior for humans and agents: see the repo-root [`ASSISTANT.md`](../ASSISTANT.md).
