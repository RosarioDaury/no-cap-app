from collections.abc import Generator
import re

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.engine import Engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import settings

_engine: Engine | None = None


class Base(DeclarativeBase):
    pass


def get_engine() -> Engine:
    global _engine
    if _engine is None:
        url = settings.database_url
        kwargs: dict = {}
        if url.startswith("sqlite"):
            kwargs["connect_args"] = {"check_same_thread": False}
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

    engine = get_engine()
    Base.metadata.create_all(bind=engine)
    _migrate_users(engine)


def _username_from_email(email: str, used: set[str]) -> str:
    local = email.split("@", 1)[0].lower()
    cleaned = re.sub(r"[^a-z0-9_]", "", local)[:24]
    if len(cleaned) < 3:
        cleaned = (cleaned + "user")[:24]
    if len(cleaned) < 3:
        cleaned = "user"
    base = cleaned
    n = 0
    while cleaned in used or not re.fullmatch(r"[a-z0-9_]{3,24}", cleaned):
        n += 1
        suffix = str(n)
        cleaned = f"{base[: 24 - len(suffix)]}{suffix}"
    used.add(cleaned)
    return cleaned


def _migrate_users(engine: Engine) -> None:
    from app.core.security import email_lookup_hash, encrypt_pii, normalize_username

    inspector = inspect(engine)
    if "users" not in inspector.get_table_names():
        return
    cols = {c["name"] for c in inspector.get_columns("users")}
    statements: list[str] = []
    if "username" not in cols:
        statements.append("ALTER TABLE users ADD COLUMN username VARCHAR(24)")
    if "email_hash" not in cols:
        statements.append("ALTER TABLE users ADD COLUMN email_hash VARCHAR(64)")
    if "email_enc" not in cols:
        statements.append("ALTER TABLE users ADD COLUMN email_enc TEXT")
    if "gender_enc" not in cols:
        statements.append("ALTER TABLE users ADD COLUMN gender_enc TEXT")
    if "dob_enc" not in cols:
        statements.append("ALTER TABLE users ADD COLUMN dob_enc TEXT")
    if statements:
        with engine.begin() as conn:
            for sql in statements:
                conn.execute(text(sql))
        inspector = inspect(engine)
        cols = {c["name"] for c in inspector.get_columns("users")}

    select_cols = [
        "id",
        "username",
        "email_hash",
        "email_enc",
        "password_hash",
        "gender_enc",
        "dob_enc",
        "created_at",
    ]
    if "email" in cols:
        select_cols.append("email")

    with engine.begin() as conn:
        rows = conn.execute(text(f"SELECT {', '.join(select_cols)} FROM users")).mappings().all()
        used = {
            normalize_username(row["username"])
            for row in rows
            if row["username"]
        }
        for row in rows:
            username = row["username"]
            email_plain = ""
            if "email" in cols and row.get("email"):
                email_plain = str(row["email"]).strip().lower()
            email_enc = row["email_enc"]
            email_hash = row["email_hash"]
            gender_enc = row["gender_enc"]
            dob_enc = row["dob_enc"]
            if email_plain and not email_enc:
                email_enc = encrypt_pii(email_plain)
                email_hash = email_lookup_hash(email_plain)
            if not username:
                seed = email_plain or f"user{row['id'][-6:]}"
                username = _username_from_email(seed if "@" in seed else f"{seed}@x", used)
            else:
                used.add(normalize_username(username))
            if not gender_enc:
                gender_enc = encrypt_pii("prefer_not")
            if not dob_enc:
                dob_enc = encrypt_pii("1990-01-01")
            conn.execute(
                text(
                    """
                    UPDATE users
                    SET username = :username,
                        email_hash = :email_hash,
                        email_enc = :email_enc,
                        gender_enc = :gender_enc,
                        dob_enc = :dob_enc
                    WHERE id = :id
                    """
                ),
                {
                    "id": row["id"],
                    "username": username,
                    "email_hash": email_hash,
                    "email_enc": email_enc,
                    "gender_enc": gender_enc,
                    "dob_enc": dob_enc,
                },
            )

        if "email" in cols:
            conn.execute(text("PRAGMA foreign_keys=OFF"))
            conn.execute(
                text(
                    """
                    CREATE TABLE users_new (
                        id VARCHAR(40) NOT NULL PRIMARY KEY,
                        username VARCHAR(24) NOT NULL,
                        email_hash VARCHAR(64) NOT NULL,
                        email_enc TEXT NOT NULL,
                        password_hash VARCHAR(255) NOT NULL,
                        gender_enc TEXT NOT NULL,
                        dob_enc TEXT NOT NULL,
                        created_at DATETIME
                    )
                    """
                )
            )
            conn.execute(
                text(
                    """
                    INSERT INTO users_new (
                        id, username, email_hash, email_enc, password_hash,
                        gender_enc, dob_enc, created_at
                    )
                    SELECT
                        id, username, email_hash, email_enc, password_hash,
                        gender_enc, dob_enc, created_at
                    FROM users
                    """
                )
            )
            conn.execute(text("DROP TABLE users"))
            conn.execute(text("ALTER TABLE users_new RENAME TO users"))

        conn.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS ix_users_username ON users (username)"))
        conn.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS ix_users_email_hash ON users (email_hash)"))
