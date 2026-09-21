# NoCap backend — agent instructions

FastAPI modular monolith. All server-side features belong in this package.

## Layout

| Path | Owns |
|------|------|
| `app/main.py` | FastAPI app instance, middleware, router includes |
| `app/core/` | Settings and shared config |
| `app/api/` | HTTP routes (one module per resource) |
| `tests/` | API tests |

When a feature outgrows a single route file, add `app/services/` and `app/schemas/` — do not start a second app.

## Commands

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
fastapi dev
```

API docs: http://127.0.0.1:8000/docs

## Conventions

- Pydantic models for request/response bodies.
- Settings via `pydantic-settings` and `.env` (see `.env.example`).
- Keep money as integer cents if it is persisted later, matching the mobile app.
- Do not add a database until the feature that needs one is being built.
