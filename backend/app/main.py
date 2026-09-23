from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.assistant import router as assistant_router
from app.api.auth import router as auth_router
from app.api.conversations import router as conversations_router
from app.api.health import router as health_router
from app.core.config import settings
from app.core.db import init_db


@asynccontextmanager
async def lifespan(_app: FastAPI):
    init_db()
    yield


app = FastAPI(
    title=settings.app_name,
    version="0.2.0",
    description="NoCap API — auth, saved chats, and snapshot-based assistant.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router)
app.include_router(auth_router)
app.include_router(conversations_router)
app.include_router(assistant_router)


@app.get("/")
async def root() -> dict[str, str]:
    return {"name": settings.app_name, "status": "ok"}
