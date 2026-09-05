"""Voice profile endpoints.

Phase 1: metadata CRUD + voice-rights confirmation. Reference-audio upload and
audio validation are implemented in Phase 2 (Voice Management).
"""

from __future__ import annotations

from fastapi import APIRouter

from app.dependencies import CurrentUserDep, SupabaseDep
from app.schemas.common import DeletedResponse
from app.schemas.voice import VoiceCreate, VoiceOut, VoiceUpdate
from app.services import voices_service as svc

router = APIRouter(prefix="/voices", tags=["voices"])


@router.get("", response_model=list[VoiceOut])
def list_voices(user: CurrentUserDep, client: SupabaseDep) -> list[dict]:
    return svc.list_voices(client, user.id)


@router.post("", response_model=VoiceOut, status_code=201)
def create_voice(body: VoiceCreate, user: CurrentUserDep, client: SupabaseDep) -> dict:
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
    svc.delete_voice(client, user.id, voice_id)
    return DeletedResponse(id=voice_id)
