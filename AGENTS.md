# NoCap — agent instructions

This is a **single-repo monolith**. Keep product work in this repository. Do not split into extra services.

## Layout

| Path | Owns |
|------|------|
| `mobile/` | Expo SDK 57 React Native app (UI, on-device SQLite, offline budgeting) |
| `backend/` | FastAPI API (networked features: AI, auth, sync — add here as they land) |
| `nocap-design 3/` | Static HTML design reference |

## How to work here

1. Read this file, then the package-level `AGENTS.md` in the folder you are changing.
2. Mobile work: read https://docs.expo.dev/versions/v57.0.0/ before writing Expo / React Native code.
3. Backend work: grow FastAPI as a **modular monolith** (`app/api`, `app/core`, then `app/services` when a feature needs it). Do not add a second Python process or a Node API.
4. Run commands from the package directory (`mobile/` or `backend/`).
5. If a feature needs both sides, define the API in `backend/` first, then call it from `mobile/`.
6. Snapshot chat / accounts: read [`ASSISTANT.md`](ASSISTANT.md) before changing the AI path.

## Do not

- Create microservices, extra Node APIs, or an npm `packages/` workspace unless asked.
- Put FastAPI code under `mobile/` or Expo screens under `backend/`.
- Add npm workspaces; the backend is Python and the mobile app is self-contained.
