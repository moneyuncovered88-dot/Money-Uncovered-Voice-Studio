"""Application configuration loaded from environment variables.

Values come from the process environment and, for local development, from a
`.env` file at the repository root (and/or `apps/api/.env`). Secrets must never
be committed — see `.env.example`.
"""

from __future__ import annotations

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Typed application settings.

    Field names map case-insensitively to environment variables, so
    `supabase_url` reads `SUPABASE_URL`.
    """

    model_config = SettingsConfigDict(
        # Later files override earlier ones; both are optional.
        env_file=("../../.env", ".env"),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # App
    app_env: str = "development"
    log_level: str = "INFO"

    # Supabase
    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_service_role_key: str = ""
    supabase_jwt_secret: str = ""

    # CORS (comma-separated list of origins)
    backend_cors_origins: str = "http://localhost:3000"
    backend_url: str = "http://localhost:8000"

    # TTS
    tts_provider: str = "mock"  # mock | chatterbox
    model_name: str = "chatterbox-turbo"
    tts_max_chunk_chars: int = 600

    # RunPod
    runpod_api_key: str = ""
    runpod_endpoint_id: str = ""

    # Modal (alternative GPU host). Endpoint URL from `modal deploy`, plus a
    # shared token the worker checks against its MU_TTS_TOKEN secret.
    modal_endpoint_url: str = ""
    modal_token: str = ""

    # Storage
    signed_url_expiry: int = 3600

    # Cost tracking (informational only)
    gpu_cost_per_hour: float = 0.0

    # Narration defaults
    default_words_per_minute: int = 150
    default_output_format: str = "mp3"

    @property
    def cors_origins(self) -> list[str]:
        """Parsed list of allowed CORS origins."""
        return [o.strip() for o in self.backend_cors_origins.split(",") if o.strip()]

    @property
    def is_production(self) -> bool:
        return self.app_env.lower() == "production"

    @property
    def supabase_configured(self) -> bool:
        return bool(self.supabase_url and self.supabase_service_role_key)


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return a cached Settings instance."""
    return Settings()
