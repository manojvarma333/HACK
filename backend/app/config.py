"""Application configuration loaded from environment / .env file."""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# Anchor the default SQLite DB to the backend directory so the same database is
# used no matter which working directory the server is launched from.
_BACKEND_ROOT = Path(__file__).resolve().parents[1]
_DEFAULT_DB_URL = f"sqlite:///{(_BACKEND_ROOT / 'data' / 'voicestock.db').as_posix()}"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )

    # Security
    jwt_secret: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 1440

    # Database
    database_url: str = _DEFAULT_DB_URL

    # CORS
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    # NLU
    nlu_provider: str = "gemini"
    gemini_api_key: str = ""
    gemini_model: str = "gemini-1.5-flash"

    # Whisper
    whisper_backend: str = "faster-whisper"
    whisper_model: str = "small"
    whisper_device: str = "cpu"
    whisper_compute_type: str = "int8"

    # Audio
    max_audio_mb: int = 15

    # Mode
    default_mode: str = "simulation"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def gemini_enabled(self) -> bool:
        return bool(self.gemini_api_key.strip())

    @property
    def whisper_enabled(self) -> bool:
        return bool(self.whisper_model.strip())


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
