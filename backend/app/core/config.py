from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


def postgres_sqlalchemy_url(url: str) -> str:
    """Railway and many hosts inject postgresql://; this app uses psycopg 3."""
    if url.startswith("postgres://"):
        return "postgresql+psycopg://" + url.removeprefix("postgres://")
    if url.startswith("postgresql://"):
        return "postgresql+psycopg://" + url.removeprefix("postgresql://")
    return url


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "NoCap API"
    env: str = "development"
    cors_origins: str = (
        "http://localhost:8081,http://localhost:19006,http://127.0.0.1:8081"
    )
    database_url: str = "postgresql+psycopg://nocap:nocap@127.0.0.1:5434/nocap"
    jwt_secret: str = "dev-only-change-me"
    pii_key: str = "dev-only-pii-key-change-me"
    jwt_expire_minutes: int = 60 * 24 * 14
    llm_api_key: str = ""
    llm_base_url: str = "https://api.openai.com/v1"
    llm_model: str = "gpt-4.1-mini"
    snapshot_max_bytes: int = 8192
    chat_history_limit: int = 8

    @field_validator("database_url", mode="before")
    @classmethod
    def _psycopg_database_url(cls, value: object) -> object:
        if isinstance(value, str):
            return postgres_sqlalchemy_url(value)
        return value

    @property
    def cors_origin_list(self) -> list[str]:
        return [
            origin.strip()
            for origin in self.cors_origins.split(",")
            if origin.strip()
        ]


settings = Settings()
