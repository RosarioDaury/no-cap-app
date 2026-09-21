# NoCap backend

FastAPI service for upcoming networked NoCap features (AI, auth, sync). The mobile app in `../mobile` stays offline-first; this API is additive.

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
