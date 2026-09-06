"""Provider selection based on configuration.

Guards against accidentally using the mock provider in production.
"""

from __future__ import annotations

from functools import lru_cache

from app.config import get_settings
from app.errors import AppError
from app.services.tts.base import TTSProvider
from app.services.tts.chatterbox import ChatterboxProvider
from app.services.tts.mock import MockTTSProvider


@lru_cache(maxsize=1)
def get_tts_provider() -> TTSProvider:
    """Return the configured TTS provider (cached)."""
    settings = get_settings()
    provider = settings.tts_provider.lower().strip()

    if provider == "mock":
        if settings.is_production:
            raise AppError(
                "Refusing to use the mock TTS provider in production. "
                "Set TTS_PROVIDER=chatterbox.",
                code="mock_in_production",
                status_code=500,
            )
        return MockTTSProvider()

    if provider == "chatterbox":
        return ChatterboxProvider(model_name=settings.model_name)

    if provider == "modal":
        # Same Chatterbox contract, but dispatched to a Modal web endpoint.
        from app.services.modal_client import run_sync as modal_run

        return ChatterboxProvider(model_name=settings.model_name, runner=modal_run)

    raise AppError(
        f"Unknown TTS_PROVIDER '{settings.tts_provider}'. Use 'mock', 'chatterbox', or 'modal'.",
        code="unknown_provider",
        status_code=500,
    )
