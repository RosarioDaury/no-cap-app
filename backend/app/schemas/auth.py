from datetime import date
from typing import Literal

from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator

from app.core.security import is_valid_username, normalize_username

Gender = Literal["female", "male", "non_binary", "prefer_not", "other"]


class RegisterRequest(BaseModel):
    username: str = Field(min_length=3, max_length=24)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    gender: Gender
    date_of_birth: date

    @field_validator("username")
    @classmethod
    def username_ok(cls, value: str) -> str:
        username = normalize_username(value)
        if not is_valid_username(username):
            raise ValueError("Username must be 3–24 characters: letters, numbers, underscore")
        return username

    @field_validator("date_of_birth")
    @classmethod
    def dob_ok(cls, value: date) -> date:
        today = date.today()
        if value > today:
            raise ValueError("Date of birth cannot be in the future")
        try:
            thirteenth = value.replace(year=value.year + 13)
        except ValueError:
            thirteenth = date(value.year + 13, 2, 28)
        if thirteenth > today:
            raise ValueError("You must be at least 13")
        if value.year < 1900:
            raise ValueError("Date of birth is not valid")
        return value


class LoginRequest(BaseModel):
    password: str = Field(min_length=1, max_length=128)
    identifier: str | None = Field(default=None, min_length=1, max_length=255)
    email: EmailStr | None = None
    username: str | None = Field(default=None, min_length=1, max_length=24)

    @model_validator(mode="after")
    def need_login_id(self) -> "LoginRequest":
        if not (self.identifier or self.email or self.username):
            raise ValueError("Provide username or email")
        return self


class AvailabilityResponse(BaseModel):
    username_taken: bool | None = None
    email_taken: bool | None = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    username: str
    email: str


class MeResponse(BaseModel):
    id: str
    username: str
    email: str
    gender: Gender
    date_of_birth: date
