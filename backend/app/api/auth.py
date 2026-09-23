from datetime import date

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.deps import CurrentUser, DbSession
from app.core.security import (
    create_access_token,
    decrypt_pii,
    email_lookup_hash,
    encrypt_pii,
    hash_password,
    is_valid_username,
    normalize_username,
    verify_password,
)
from app.models import User
from app.schemas.auth import (
    AvailabilityResponse,
    LoginRequest,
    MeResponse,
    RegisterRequest,
    TokenResponse,
)
from app.services.assistant import new_id

router = APIRouter(prefix="/v1/auth", tags=["auth"])

_GENDERS = {"female", "male", "non_binary", "prefer_not", "other"}


def _public_user(user: User) -> tuple[str, str, str, date]:
    email = decrypt_pii(user.email_enc)
    gender = decrypt_pii(user.gender_enc)
    if gender not in _GENDERS:
        raise ValueError("Could not decrypt profile field")
    dob = date.fromisoformat(decrypt_pii(user.dob_enc))
    return user.username, email, gender, dob


def _token(user: User) -> TokenResponse:
    username, email, _, _ = _public_user(user)
    return TokenResponse(
        access_token=create_access_token(user.id, username),
        user_id=user.id,
        username=username,
        email=email,
    )


def _find_by_login(db: Session, raw: str) -> User | None:
    value = raw.strip()
    if "@" in value:
        return db.scalar(select(User).where(User.email_hash == email_lookup_hash(value)))
    username = normalize_username(value)
    return db.scalar(select(User).where(User.username == username))


@router.get("/available", response_model=AvailabilityResponse)
def available(
    db: DbSession,
    username: str | None = Query(default=None),
    email: str | None = Query(default=None),
) -> AvailabilityResponse:
    username_taken: bool | None = None
    email_taken: bool | None = None
    if username is not None:
        name = normalize_username(username)
        if not is_valid_username(name):
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid username")
        username_taken = db.scalar(select(User.id).where(User.username == name)) is not None
    if email is not None:
        email_taken = (
            db.scalar(select(User.id).where(User.email_hash == email_lookup_hash(email))) is not None
        )
    return AvailabilityResponse(username_taken=username_taken, email_taken=email_taken)


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(body: RegisterRequest, db: DbSession) -> TokenResponse:
    email = str(body.email).lower()
    if db.scalar(select(User.id).where(User.username == body.username)):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Username already taken")
    if db.scalar(select(User.id).where(User.email_hash == email_lookup_hash(email))):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")
    user = User(
        id=new_id("user"),
        username=body.username,
        email_hash=email_lookup_hash(email),
        email_enc=encrypt_pii(email),
        password_hash=hash_password(body.password),
        gender_enc=encrypt_pii(body.gender),
        dob_enc=encrypt_pii(body.date_of_birth.isoformat()),
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Username or email already taken")
    db.refresh(user)
    return _token(user)


@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest, db: DbSession) -> TokenResponse:
    raw = body.identifier or body.username or (str(body.email) if body.email else "")
    user = _find_by_login(db, raw)
    if user is None or not verify_password(body.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username, email, or password",
        )
    return _token(user)


@router.get("/me", response_model=MeResponse)
def me(user: CurrentUser) -> MeResponse:
    try:
        username, email, gender, dob = _public_user(user)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not read profile",
        )
    return MeResponse(
        id=user.id,
        username=username,
        email=email,
        gender=gender,  # type: ignore[arg-type]
        date_of_birth=dob,
    )
