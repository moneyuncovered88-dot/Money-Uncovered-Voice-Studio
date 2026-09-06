"""Voice profile endpoints.

Phase 1: metadata CRUD + voice-rights confirmation.
Phase 2: reference-audio upload to the private `voice-references` bucket,
validation, best-effort duration probing, and signed-URL playback.
"""

from __future__ import annotations

import os
import tempfile

from fastapi import APIRouter, File, UploadFile

from app.audio.probe import probe_wav_bytes, probe_with_ffprobe
from app.dependencies import CurrentUserDep, SettingsDep, SupabaseDep, VerifiedUserDep
from app.errors import ValidationError
from app.schemas.common import DeletedResponse
from app.schemas.voice import VoiceCreate, VoiceOut, VoiceUpdate
from app.services import storage_service, usage_service
from app.services import voices_service as svc

router = APIRouter(prefix="/voices", tags=["voices"])

# Upload constraints.
_ALLOWED_EXT = {"wav": "audio/wav", "mp3": "audio/mpeg", "m4a": "audio/mp4", "flac": "audio/flac"}
_MAX_BYTES = 25 * 1024 * 1024  # 25 MB
_MIN_BYTES = 2 * 1024  # 2 KB


@router.get("", response_model=list[VoiceOut])
def list_voices(user: CurrentUserDep, client: SupabaseDep) -> list[dict]:
    return svc.list_voices(client, user.id)


@router.post("", response_model=VoiceOut, status_code=201)
def create_voice(body: VoiceCreate, user: VerifiedUserDep, client: SupabaseDep) -> dict:
    usage_service.ensure_can_add_voice(client, user.id)
    return svc.create_voice(client, user.id, body.model_dump())


@router.get("/{voice_id}", response_model=VoiceOut)
def get_voice(voice_id: str, user: CurrentUserDep, client: SupabaseDep) -> dict:
    return svc.get_voice(client, user.id, voice_id)


@router.patch("/{voice_id}", response_model=VoiceOut)
def update_voice(
    voice_id: str, body: VoiceUpdate, user: CurrentUserDep, client: SupabaseDep
) -> dict:
    return svc.update_voice(client, user.id, voice_id, body.model_dump(exclude_none=True))


@router.delete("/{voice_id}", response_model=DeletedResponse)
def delete_voice(
    voice_id: str, user: CurrentUserDep, client: SupabaseDep
) -> DeletedResponse:
    voice = svc.get_voice(client, user.id, voice_id)
    ref_path = voice.get("reference_audio_path")
    if ref_path:
        try:
            storage_service.remove(client, storage_service.VOICE_REFERENCES_BUCKET, ref_path)
        except Exception:
            pass  # best-effort cleanup; still delete the row
    svc.delete_voice(client, user.id, voice_id)
    return DeletedResponse(id=voice_id)


@router.post("/{voice_id}/reference", response_model=VoiceOut)
async def upload_reference(
    voice_id: str,
    user: CurrentUserDep,
    client: SupabaseDep,
    file: UploadFile = File(...),
) -> dict:
    """Upload the narrator reference recording for a voice."""
    svc.get_voice(client, user.id, voice_id)  # ownership / 404

    ext = (os.path.splitext(file.filename or "")[1].lstrip(".") or "").lower()
    if ext not in _ALLOWED_EXT:
        raise ValidationError(
            f"Unsupported audio type '.{ext}'. Allowed: {', '.join(_ALLOWED_EXT)}."
        )

    data = await file.read()
    if len(data) < _MIN_BYTES:
        raise ValidationError("That file looks too small to be a valid recording.")
    if len(data) > _MAX_BYTES:
        raise ValidationError("Reference audio must be 25 MB or smaller.")

    # Best-effort duration / sample-rate.
    if ext == "wav":
        duration, sample_rate = probe_wav_bytes(data)
    else:
        with tempfile.NamedTemporaryFile(suffix=f".{ext}", delete=False) as tmp:
            tmp.write(data)
            tmp_path = tmp.name
        try:
            duration, sample_rate = probe_with_ffprobe(tmp_path)
        finally:
            os.unlink(tmp_path)

    path = f"{user.id}/{voice_id}.{ext}"
    storage_service.upload_bytes(
        client,
        storage_service.VOICE_REFERENCES_BUCKET,
        path,
        data,
        _ALLOWED_EXT[ext],
    )

    return svc.update_voice(
        client,
        user.id,
        voice_id,
        {
            "reference_audio_path": path,
            "reference_duration_seconds": duration,
            "reference_sample_rate": sample_rate,
        },
    )


@router.get("/{voice_id}/reference-url")
def reference_url(
    voice_id: str,
    user: CurrentUserDep,
    client: SupabaseDep,
    settings: SettingsDep,
) -> dict:
    """Return a short-lived signed URL to play the reference recording."""
    voice = svc.get_voice(client, user.id, voice_id)
    ref_path = voice.get("reference_audio_path")
    if not ref_path:
        raise ValidationError("This voice has no reference recording yet.")
    url = storage_service.create_signed_url(
        client,
        storage_service.VOICE_REFERENCES_BUCKET,
        ref_path,
        settings.signed_url_expiry,
    )
    return {"url": url}
