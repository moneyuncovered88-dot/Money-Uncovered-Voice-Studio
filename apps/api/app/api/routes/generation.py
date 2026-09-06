"""Generation endpoints: preview, full generate, status, chunks, assemble,
audio, and single-chunk regeneration."""

from __future__ import annotations

from fastapi import APIRouter, BackgroundTasks

from app.dependencies import CurrentUserDep, SupabaseDep, VerifiedUserDep
from app.schemas.generation import (
    AudioUrls,
    ChunkOut,
    JobOut,
    PreviewResponse,
    RegenerateRequest,
    StatusResponse,
)
from app.schemas.project import ProjectOut
from app.services import chunks_service, generation_service, jobs_service

router = APIRouter(tags=["generation"])


@router.get("/jobs", response_model=list[JobOut])
def list_generation_history(user: CurrentUserDep, client: SupabaseDep) -> list[dict]:
    return jobs_service.list_jobs(client, user.id)


@router.post("/projects/{project_id}/preview", response_model=PreviewResponse)
def generate_preview(project_id: str, user: VerifiedUserDep, client: SupabaseDep) -> dict:
    return generation_service.generate_preview(client, user.id, project_id)


@router.post("/projects/{project_id}/generate", response_model=JobOut)
def generate_full(
    project_id: str,
    background: BackgroundTasks,
    user: VerifiedUserDep,
    client: SupabaseDep,
) -> dict:
    job = generation_service.start_generation(client, user.id, project_id)
    # process_job opens its own service client; run it after the response.
    background.add_task(generation_service.process_job, job["id"], user.id)
    return job


@router.post("/projects/{project_id}/cancel")
def cancel_generation(project_id: str, user: CurrentUserDep, client: SupabaseDep) -> dict:
    """Cancel a running (or orphaned) generation so the project can be retried."""
    return generation_service.cancel_generation(client, user.id, project_id)


@router.get("/projects/{project_id}/status", response_model=StatusResponse)
def generation_status(project_id: str, user: CurrentUserDep, client: SupabaseDep) -> dict:
    return generation_service.chunk_status_summary(client, user.id, project_id)


@router.get("/projects/{project_id}/chunks", response_model=list[ChunkOut])
def list_project_chunks(project_id: str, user: CurrentUserDep, client: SupabaseDep) -> list[dict]:
    from app.services import projects_service

    projects_service.get_project(client, user.id, project_id)  # ownership / 404
    return chunks_service.list_chunks(client, project_id)


@router.post("/projects/{project_id}/assemble", response_model=ProjectOut)
def assemble(project_id: str, user: CurrentUserDep, client: SupabaseDep) -> dict:
    return generation_service.rebuild_final(client, user.id, project_id)


@router.get("/projects/{project_id}/audio", response_model=AudioUrls)
def project_audio(project_id: str, user: CurrentUserDep, client: SupabaseDep) -> dict:
    return generation_service.final_audio_urls(client, user.id, project_id)


@router.post("/chunks/{chunk_id}/regenerate", response_model=ChunkOut)
def regenerate_chunk(
    chunk_id: str,
    body: RegenerateRequest,
    user: CurrentUserDep,
    client: SupabaseDep,
) -> dict:
    return generation_service.regenerate_chunk(client, user.id, chunk_id, body.text)


@router.get("/chunks/{chunk_id}/audio-url")
def chunk_audio_url(chunk_id: str, user: CurrentUserDep, client: SupabaseDep) -> dict:
    return generation_service.chunk_audio_url(client, user.id, chunk_id)
