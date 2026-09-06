"""Health checks. These are cheap and never trigger GPU inference."""

from __future__ import annotations

from fastapi import APIRouter

from app import __version__
from app.config import get_settings

router = APIRouter(tags=["health"])


@router.get("/health")
def health() -> dict[str, object]:
    settings = get_settings()
    return {
        "status": "ok",
        "version": __version__,
        "app_env": settings.app_env,
        "supabase_configured": settings.supabase_configured,
        "tts_provider": settings.tts_provider,
    }


@router.get("/health/tts")
def health_tts() -> dict[str, object]:
    """Report TTS configuration availability without invoking the model."""
    settings = get_settings()
    runpod_configured = bool(settings.runpod_api_key and settings.runpod_endpoint_id)
    return {
        "provider": settings.tts_provider,
        "model_name": settings.model_name,
        "runpod_configured": runpod_configured,
        "modal_configured": bool(settings.modal_endpoint_url),
        "max_chunk_chars": settings.tts_max_chunk_chars,
    }
