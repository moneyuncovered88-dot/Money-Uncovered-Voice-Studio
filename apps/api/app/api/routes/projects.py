"""Project endpoints: CRUD, script analysis, and duplication."""

from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.dependencies import CurrentUserDep, SupabaseDep
from app.schemas.common import DeletedResponse
from app.schemas.project import (
    ProjectCreate,
    ProjectListItem,
    ProjectOut,
    ProjectUpdate,
    ScriptAnalysis,
)
from app.services import projects_service as svc

router = APIRouter(prefix="/projects", tags=["projects"])


class AnalyzeRequest(BaseModel):
    script: str = Field(default="", max_length=200_000)
    narration_preset: str | None = None
    speak_headings: bool = False


@router.get("", response_model=list[ProjectListItem])
def list_projects(user: CurrentUserDep, client: SupabaseDep) -> list[dict]:
    return svc.list_projects(client, user.id)


@router.post("", response_model=ProjectOut, status_code=201)
def create_project(
    body: ProjectCreate, user: CurrentUserDep, client: SupabaseDep
) -> dict:
    return svc.create_project(client, user.id, body.model_dump())


@router.post("/analyze", response_model=ScriptAnalysis)
def analyze_script(
    body: AnalyzeRequest, user: CurrentUserDep, client: SupabaseDep
) -> dict:
    return svc.analyze_script(
        client,
        user.id,
        script=body.script,
        narration_preset=body.narration_preset,
        speak_headings=body.speak_headings,
    )


@router.get("/{project_id}", response_model=ProjectOut)
def get_project(project_id: str, user: CurrentUserDep, client: SupabaseDep) -> dict:
    return svc.get_project(client, user.id, project_id)


@router.patch("/{project_id}", response_model=ProjectOut)
def update_project(
    project_id: str,
    body: ProjectUpdate,
    user: CurrentUserDep,
    client: SupabaseDep,
) -> dict:
    return svc.update_project(client, user.id, project_id, body.model_dump(exclude_unset=True))


@router.delete("/{project_id}", response_model=DeletedResponse)
def delete_project(
    project_id: str, user: CurrentUserDep, client: SupabaseDep
) -> DeletedResponse:
    svc.delete_project(client, user.id, project_id)
    return DeletedResponse(id=project_id)


@router.post("/{project_id}/duplicate", response_model=ProjectOut, status_code=201)
def duplicate_project(
    project_id: str, user: CurrentUserDep, client: SupabaseDep
) -> dict:
    src = svc.get_project(client, user.id, project_id)
    # Copy settings/voice/script — never the generated final audio.
    return svc.create_project(
        client,
        user.id,
        {
            "title": f"{src.get('title', 'Untitled')} (Copy)",
            "video_title": src.get("video_title"),
            "voice_profile_id": src.get("voice_profile_id"),
            "narration_preset": src.get("narration_preset", "money_uncovered_documentary"),
            "speak_headings": bool(src.get("speak_headings", False)),
            "notes": src.get("notes"),
            "script_original": src.get("script_original", ""),
            "settings": src.get("settings") or {},
        },
    )
