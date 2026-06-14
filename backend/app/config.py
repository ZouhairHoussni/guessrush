from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "GuessRush"
    backend_database_url: str = "sqlite:///./guessrush.db"
    frontend_origin: str = "http://localhost:5173"
    public_app_url: str = "http://localhost:5173"
    app_secret: str = "change-me-in-development"
    cors_allowed_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    @property
    def sqlalchemy_database_url(self) -> str:
        if self.backend_database_url.startswith("sqlite+aiosqlite://"):
            return self.backend_database_url.replace("sqlite+aiosqlite://", "sqlite://", 1)
        return self.backend_database_url

    @property
    def cors_origins(self) -> list[str]:
        return [
            origin.strip()
            for origin in self.cors_allowed_origins.split(",")
            if origin.strip()
        ]

    def join_url_for_code(self, code: str) -> str:
        return f"{self.public_app_url.rstrip('/')}/join/{code}"


@lru_cache
def get_settings() -> Settings:
    return Settings()
