import base64
import hashlib
import hmac
import os
import re
from datetime import datetime, timedelta, timezone

import jwt
from cryptography.fernet import Fernet, InvalidToken

from app.core.config import settings

_PBKDF2_ROUNDS = 390_000
USERNAME_RE = re.compile(r"^[a-z0-9_]{3,24}$")


def hash_password(password: str) -> str:
    salt = os.urandom(16)
    derived = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, _PBKDF2_ROUNDS)
    return f"pbkdf2${_PBKDF2_ROUNDS}${salt.hex()}${derived.hex()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        scheme, rounds_s, salt_hex, hash_hex = stored.split("$", 3)
    except ValueError:
        return False
    if scheme != "pbkdf2":
        return False
    try:
        rounds = int(rounds_s)
        salt = bytes.fromhex(salt_hex)
        expected = bytes.fromhex(hash_hex)
    except ValueError:
        return False
    derived = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, rounds)
    return hmac.compare_digest(derived, expected)


def normalize_username(raw: str) -> str:
    return raw.strip().lower()


def is_valid_username(username: str) -> bool:
    return bool(USERNAME_RE.match(username))


def _fernet() -> Fernet:
    digest = hashlib.sha256(settings.pii_key.encode("utf-8")).digest()
    return Fernet(base64.urlsafe_b64encode(digest))


def encrypt_pii(value: str) -> str:
    return _fernet().encrypt(value.encode("utf-8")).decode("utf-8")


def decrypt_pii(token: str) -> str:
    try:
        return _fernet().decrypt(token.encode("utf-8")).decode("utf-8")
    except InvalidToken as exc:
        raise ValueError("Could not decrypt profile field") from exc


def email_lookup_hash(email: str) -> str:
    key = settings.pii_key.encode("utf-8")
    return hmac.new(key, email.strip().lower().encode("utf-8"), hashlib.sha256).hexdigest()


def create_access_token(user_id: str, username: str) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": user_id,
        "username": username,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(minutes=settings.jwt_expire_minutes)).timestamp()),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm="HS256")


def decode_access_token(token: str) -> dict:
    return jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
