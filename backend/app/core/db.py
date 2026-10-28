from collections.abc import Generator
from pathlib import Path
import time

from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import settings

_engine: Engine | None = None
_BACKEND_ROOT = Path(__file__).resolve().parents[2]


class Base(DeclarativeBase):
    pass


def is_sqlite(url: str | None = None) -> bool:
    return (url or settings.database_url).startswith("sqlite")


def get_engine() -> Engine:
    global _engine
    if _engine is None:
        url = settings.database_url
        kwargs: dict = {"pool_pre_ping": True}
        if is_sqlite(url):
            kwargs["connect_args"] = {"check_same_thread": False}
        else:
            kwargs["pool_size"] = 5
            kwargs["max_overflow"] = 10
        _engine = create_engine(url, **kwargs)
    return _engine


def reset_db_engine() -> None:
    global _engine
    if _engine is not None:
        _engine.dispose()
        _engine = None


def session_factory() -> sessionmaker[Session]:
    return sessionmaker(bind=get_engine(), autoflush=False, expire_on_commit=False)


def get_db() -> Generator[Session, None, None]:
    db = session_factory()()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    from app import models  # noqa: F401

    last_error: OperationalError | None = None
    for attempt in range(10):
        try:
            if is_sqlite():
                Base.metadata.create_all(bind=get_engine())
            else:
                _run_alembic_upgrade()
            return
        except OperationalError as exc:
            last_error = exc
            reset_db_engine()
            time.sleep(1)
    raise RuntimeError(
        "Could not connect to the database. Start Postgres with "
        "`docker compose up -d` from backend/."
    ) from last_error


def _run_alembic_upgrade() -> None:
    from alembic import command
    from alembic.config import Config

    cfg = Config(str(_BACKEND_ROOT / "alembic.ini"))
    cfg.set_main_option("script_location", str(_BACKEND_ROOT / "migrations"))
    command.upgrade(cfg, "head")
