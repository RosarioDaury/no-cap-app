from pydantic_settings import BaseSettings, SettingsConfigDict


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
    database_url: str = "sqlite:///./nocap.db"
    jwt_secret: str = "dev-only-change-me"
    pii_key: str = "dev-only-pii-key-change-me"
    jwt_expire_minutes: int = 60 * 24 * 14
    llm_api_key: str = ""
    llm_base_url: str = "https://api.openai.com/v1"
    llm_model: str = "gpt-4.1-mini"
    snapshot_max_bytes: int = 8192
    chat_history_limit: int = 8

    @property
    def cors_origin_list(self) -> list[str]:
        return [
            origin.strip()
            for origin in self.cors_origins.split(",")
            if origin.strip()
        ]


settings = Settings()
