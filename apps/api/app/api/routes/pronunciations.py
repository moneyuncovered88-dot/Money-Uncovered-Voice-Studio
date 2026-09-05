"""Pronunciation dictionary endpoints."""

from __future__ import annotations

from fastapi import APIRouter

from app.dependencies import CurrentUserDep, SupabaseDep
from app.preprocessing.pronunciation import PronunciationEntry, apply_pronunciations
from app.schemas.common import DeletedResponse
from app.schemas.pronunciation import (
    PronunciationCreate,
    PronunciationOut,
    PronunciationPreviewRequest,
    PronunciationPreviewResponse,
    PronunciationUpdate,
)
from app.services import pronunciations_service as svc

router = APIRouter(prefix="/pronunciations", tags=["pronunciations"])


@router.get("", response_model=list[PronunciationOut])
def list_pronunciations(user: CurrentUserDep, client: SupabaseDep) -> list[dict]:
    return svc.list_entries(client, user.id)


@router.post("", response_model=PronunciationOut, status_code=201)
def create_pronunciation(
    body: PronunciationCreate, user: CurrentUserDep, client: SupabaseDep
) -> dict:
    return svc.create_entry(client, user.id, body.model_dump())


@router.patch("/{entry_id}", response_model=PronunciationOut)
def update_pronunciation(
    entry_id: str,
    body: PronunciationUpdate,
    user: CurrentUserDep,
    client: SupabaseDep,
) -> dict:
    return svc.update_entry(
        client, user.id, entry_id, body.model_dump(exclude_none=True)
    )


@router.delete("/{entry_id}", response_model=DeletedResponse)
def delete_pronunciation(
    entry_id: str, user: CurrentUserDep, client: SupabaseDep
) -> DeletedResponse:
    svc.delete_entry(client, user.id, entry_id)
    return DeletedResponse(id=entry_id)


@router.post("/preview", response_model=PronunciationPreviewResponse)
def preview_pronunciation(
    body: PronunciationPreviewRequest,
    user: CurrentUserDep,
    client: SupabaseDep,
) -> PronunciationPreviewResponse:
    rows = svc.list_entries(client, user.id)
    entries = [
        PronunciationEntry(
            term=r["term"],
            spoken_form=r["spoken_form"],
            case_sensitive=bool(r.get("case_sensitive", False)),
            whole_word=bool(r.get("whole_word", True)),
            enabled=bool(r.get("enabled", True)),
        )
        for r in rows
    ]
    processed = apply_pronunciations(body.text, entries)
    return PronunciationPreviewResponse(original=body.text, processed=processed)
