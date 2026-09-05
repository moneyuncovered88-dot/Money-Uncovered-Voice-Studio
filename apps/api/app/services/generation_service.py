"""Generation orchestration: preview, full job, chunk regen, and assembly.

Full generation runs in a background task: it generates each chunk (in a
threadpool so the event loop stays free), retries failures with backoff,
resumes already-generated chunks, then assembles the final MP3/WAV. Works with
any provider — the mock provider makes the whole flow runnable without a GPU.
"""

from __future__ import annotations

import asyncio
from typing import Any

from starlette.concurrency import run_in_threadpool
from supabase import Client

from app.audio import assembly
from app.audio.timeline import build_timeline
from app.config import get_settings
from app.errors import AppError, ConflictError, NotFoundError, ValidationError
from app.logging_config import get_logger
from app.preprocessing.pipeline import preprocess
from app.services import (
    chunks_service,
    jobs_service,
    projects_service,
    storage_service,
    voices_service,
)
from app.services.presets import get_preset
from app.services.pronunciations_service import load_active_entries
from app.services.supabase_client import get_service_client
from app.services.tts.base import VoiceReference
from app.services.tts.factory import get_tts_provider

logger = get_logger("app.generation")

_MAX_ATTEMPTS = 3
_PREVIEW_MAX_CHARS = 600


# --------------------------------------------------------------------------- #
# Planning helpers
# --------------------------------------------------------------------------- #
def _plan(client: Client, user_id: str, project: dict[str, Any]) -> tuple[list[str], dict, float, bool]:
    """Return (chunk_texts, controls, gap_seconds, normalize) for a project."""
    settings = get_settings()
    preset = get_preset(project.get("narration_preset"))
    entries = load_active_entries(client, user_id)
    result = preprocess(
        project.get("script_original") or "",
        entries=entries,
        max_chunk_chars=settings.tts_max_chunk_chars,
        speak_headings=bool(project.get("speak_headings", False)),
        words_per_minute=preset.words_per_minute,
    )
    provider = get_tts_provider()
    base = dict(preset.settings)
    base.update((project.get("settings") or {}).get("controls") or {})
    controls = provider.validate_settings(base)

    proj_settings = project.get("settings") or {}
    gap_ms = int(proj_settings.get("sentence_pause_ms", preset.sentence_pause_ms))
    normalize = bool(proj_settings.get("normalize", True))
    return result.chunks, controls, gap_ms / 1000.0, normalize


def _build_voice(client: Client, user_id: str, project: dict[str, Any]):
    vid = project.get("voice_profile_id")
    provider = get_tts_provider()
    if not vid:
        return provider.load_voice(VoiceReference(voice_id="default"))
    voice = voices_service.get_voice(client, user_id, vid)
    audio = None
    ref_path = voice.get("reference_audio_path")
    if ref_path:
        audio = storage_service.download_bytes(
            client, storage_service.VOICE_REFERENCES_BUCKET, ref_path
        )
    return provider.load_voice(
        VoiceReference(
            voice_id=vid,
            audio=audio,
            audio_path=ref_path,
            language=voice.get("language", "en"),
        )
    )


# --------------------------------------------------------------------------- #
# Preview (synchronous, short)
# --------------------------------------------------------------------------- #
def generate_preview(client: Client, user_id: str, project_id: str) -> dict[str, Any]:
    project = projects_service.get_project(client, user_id, project_id)
    texts, controls, _gap, _norm = _plan(client, user_id, project)
    if not texts:
        raise ValidationError("There's no script to preview yet.")

    preview_text = " ".join(texts)[:_PREVIEW_MAX_CHARS]
    provider = get_tts_provider()
    voice = _build_voice(client, user_id, project)
    result = provider.generate(preview_text, voice, controls)

    path = f"{user_id}/{project_id}/preview.wav"
    storage_service.upload_bytes(
        client, storage_service.FINAL_AUDIO_BUCKET, path, result.audio, "audio/wav"
    )
    url = storage_service.create_signed_url(
        client, storage_service.FINAL_AUDIO_BUCKET, path, get_settings().signed_url_expiry
    )
    return {"url": url, "duration_seconds": result.duration_seconds}


# --------------------------------------------------------------------------- #
# Full generation
# --------------------------------------------------------------------------- #
def start_generation(client: Client, user_id: str, project_id: str) -> dict[str, Any]:
    """Create (or resume) a full generation job. Returns the job row."""
    project = projects_service.get_project(client, user_id, project_id)

    if jobs_service.get_active_job(client, project_id):
        raise ConflictError("A generation is already running for this project.")

    texts, controls, gap_seconds, normalize = _plan(client, user_id, project)
    if not texts:
        raise ValidationError("There's no script to generate yet.")

    # Reuse existing chunks (and their audio) when the script is unchanged.
    existing = chunks_service.list_chunks(client, project_id)
    if not chunks_service.plan_reuse([c["processed_text"] for c in existing], texts):
        chunks_service.replace_chunks(client, project_id, texts)

    settings = get_settings()
    job = jobs_service.create_job(
        client,
        {
            "project_id": project_id,
            "user_id": user_id,
            "type": "full",
            "status": "queued",
            "total_chunks": len(texts),
            "model_name": settings.model_name,
            "settings": {
                "controls": controls,
                "gap_seconds": gap_seconds,
                "normalize": normalize,
            },
        },
    )
    projects_service.update_project(client, user_id, project_id, {"status": "queued"})
    return job


async def process_job(job_id: str, user_id: str) -> None:
    """Background worker: generate all pending chunks, then assemble."""
    client = get_service_client()
    job = jobs_service.get_job(client, user_id, job_id)
    if not job:
        return
    project_id = job["project_id"]
    job_settings = job.get("settings") or {}
    controls = job_settings.get("controls") or {}
    gap_seconds = float(job_settings.get("gap_seconds", 0.24))
    normalize = bool(job_settings.get("normalize", True))

    try:
        project = projects_service.get_project(client, user_id, project_id)
        provider = get_tts_provider()
        voice = await run_in_threadpool(_build_voice, client, user_id, project)

        jobs_service.update_job(client, job_id, {"status": "generating"})
        projects_service.update_project(client, user_id, project_id, {"status": "generating"})

        chunks = chunks_service.list_chunks(client, project_id)
        total = len(chunks)
        completed = 0
        failed = 0

        for chunk in chunks:
            if chunk.get("status") == "generated" and chunk.get("audio_path"):
                completed += 1
                _progress(client, job_id, total, completed, failed)
                continue

            chunks_service.update_chunk(client, chunk["id"], {"status": "generating"})
            ok, err = await _generate_chunk(
                client, user_id, project_id, provider, voice, chunk, controls
            )
            if ok:
                completed += 1
            else:
                failed += 1
                chunks_service.update_chunk(
                    client, chunk["id"], {"status": "failed", "error_message": err}
                )
            _progress(client, job_id, total, completed, failed)

        if failed > 0:
            jobs_service.update_job(
                client,
                job_id,
                {"status": "failed", "error_message": f"{failed} chunk(s) failed to generate."},
            )
            projects_service.update_project(client, user_id, project_id, {"status": "failed"})
            return

        # All chunks generated -> assemble the final audio.
        jobs_service.update_job(client, job_id, {"status": "assembling"})
        projects_service.update_project(client, user_id, project_id, {"status": "assembling"})
        await run_in_threadpool(
            _assemble, client, user_id, project_id, gap_seconds, normalize
        )
        jobs_service.update_job(
            client, job_id, {"status": "completed", "progress_percentage": 100}
        )
    except Exception as exc:  # noqa: BLE001 - a job must never die silently
        logger.exception("job_failed", extra={"job_id": job_id, "project_id": project_id})
        jobs_service.update_job(client, job_id, {"status": "failed", "error_message": str(exc)})
        try:
            projects_service.update_project(client, user_id, project_id, {"status": "failed"})
        except Exception:
            pass


async def _generate_chunk(
    client: Client,
    user_id: str,
    project_id: str,
    provider: Any,
    voice: Any,
    chunk: dict[str, Any],
    controls: dict[str, Any],
) -> tuple[bool, str | None]:
    last_err: str | None = None
    for attempt in range(1, _MAX_ATTEMPTS + 1):
        try:
            result = await run_in_threadpool(
                provider.generate, chunk["processed_text"], voice, controls
            )
            path = f"{user_id}/{project_id}/{chunk['chunk_index']:03d}.wav"
            await run_in_threadpool(
                storage_service.upload_bytes,
                client,
                storage_service.GENERATED_CHUNKS_BUCKET,
                path,
                result.audio,
                "audio/wav",
            )
            chunks_service.update_chunk(
                client,
                chunk["id"],
                {
                    "status": "generated",
                    "audio_path": path,
                    "duration_seconds": result.duration_seconds,
                    "sample_rate": result.sample_rate,
                    "generation_attempt": attempt,
                    "error_message": None,
                    "settings": controls,
                },
            )
            return True, None
        except Exception as exc:  # noqa: BLE001 - retry with backoff
            last_err = str(exc)
            if attempt < _MAX_ATTEMPTS:
                await asyncio.sleep(min(2**attempt, 8))
    return False, last_err


def _progress(client: Client, job_id: str, total: int, completed: int, failed: int) -> None:
    done = completed + failed
    pct = round(done / total * 100, 1) if total else 0
    jobs_service.update_job(
        client,
        job_id,
        {"completed_chunks": completed, "failed_chunks": failed, "progress_percentage": pct},
    )


# --------------------------------------------------------------------------- #
# Assembly + single-chunk regeneration
# --------------------------------------------------------------------------- #
def _assemble(
    client: Client, user_id: str, project_id: str, gap_seconds: float, normalize: bool
) -> None:
    chunks = chunks_service.list_chunks(client, project_id)
    ready = [c for c in chunks if c.get("status") == "generated" and c.get("audio_path")]
    if not ready or len(ready) != len(chunks):
        raise ValidationError("All chunks must be generated before assembling.")

    audio_list = [
        storage_service.download_bytes(client, storage_service.GENERATED_CHUNKS_BUCKET, c["audio_path"])
        for c in ready
    ]
    result = assembly.assemble(audio_list, gap_seconds=gap_seconds, normalize=normalize)

    mp3_path = f"{user_id}/{project_id}/final.mp3"
    wav_path = f"{user_id}/{project_id}/final.wav"
    bucket = storage_service.FINAL_AUDIO_BUCKET
    storage_service.upload_bytes(client, bucket, mp3_path, result.mp3, "audio/mpeg")
    storage_service.upload_bytes(client, bucket, wav_path, result.wav, "audio/wav")

    # Store chunk timeline (start/end) for future subtitle/scene work.
    timeline = build_timeline(
        [float(c.get("duration_seconds") or 0) for c in ready], gap_seconds=gap_seconds
    )
    for chunk, entry in zip(ready, timeline, strict=False):
        chunks_service.update_chunk(
            client,
            chunk["id"],
            {"start_time_seconds": entry.start_seconds, "end_time_seconds": entry.end_seconds},
        )

    projects_service.update_project(
        client,
        user_id,
        project_id,
        {
            "status": "completed",
            "final_audio_mp3_path": mp3_path,
            "final_audio_wav_path": wav_path,
            "final_duration_seconds": result.duration_seconds,
        },
    )


def rebuild_final(client: Client, user_id: str, project_id: str) -> dict[str, Any]:
    project = projects_service.get_project(client, user_id, project_id)
    _, _controls, gap_seconds, normalize = _plan(client, user_id, project)
    _assemble(client, user_id, project_id, gap_seconds, normalize)
    return projects_service.get_project(client, user_id, project_id)


def regenerate_chunk(
    client: Client, user_id: str, chunk_id: str, new_text: str | None = None
) -> dict[str, Any]:
    chunk = chunks_service.get_chunk(client, chunk_id)
    project = projects_service.get_project(client, user_id, chunk["project_id"])  # ownership / 404

    if new_text is not None and new_text.strip():
        chunks_service.update_chunk(
            client, chunk_id, {"processed_text": new_text.strip(), "original_text": new_text.strip()}
        )
        chunk["processed_text"] = new_text.strip()

    _texts, controls, _gap, _norm = _plan(client, user_id, project)
    provider = get_tts_provider()
    voice = _build_voice(client, user_id, project)
    result = provider.generate(chunk["processed_text"], voice, controls)

    path = f"{user_id}/{project['id']}/{chunk['chunk_index']:03d}.wav"
    storage_service.upload_bytes(
        client, storage_service.GENERATED_CHUNKS_BUCKET, path, result.audio, "audio/wav"
    )
    return chunks_service.update_chunk(
        client,
        chunk_id,
        {
            "status": "generated",
            "audio_path": path,
            "duration_seconds": result.duration_seconds,
            "sample_rate": result.sample_rate,
            "error_message": None,
        },
    )


def final_audio_urls(client: Client, user_id: str, project_id: str) -> dict[str, Any]:
    project = projects_service.get_project(client, user_id, project_id)
    expiry = get_settings().signed_url_expiry
    out: dict[str, Any] = {"duration_seconds": project.get("final_duration_seconds")}
    if project.get("final_audio_mp3_path"):
        out["mp3_url"] = storage_service.create_signed_url(
            client, storage_service.FINAL_AUDIO_BUCKET, project["final_audio_mp3_path"], expiry
        )
    if project.get("final_audio_wav_path"):
        out["wav_url"] = storage_service.create_signed_url(
            client, storage_service.FINAL_AUDIO_BUCKET, project["final_audio_wav_path"], expiry
        )
    if "mp3_url" not in out and "wav_url" not in out:
        raise NotFoundError("No final audio yet. Generate the narration first.")
    return out


def chunk_audio_url(client: Client, user_id: str, chunk_id: str) -> dict[str, Any]:
    chunk = chunks_service.get_chunk(client, chunk_id)
    projects_service.get_project(client, user_id, chunk["project_id"])  # ownership / 404
    if not chunk.get("audio_path"):
        raise NotFoundError("This chunk hasn't been generated yet.")
    url = storage_service.create_signed_url(
        client,
        storage_service.GENERATED_CHUNKS_BUCKET,
        chunk["audio_path"],
        get_settings().signed_url_expiry,
    )
    return {"url": url}


def chunk_status_summary(client: Client, user_id: str, project_id: str) -> dict[str, Any]:
    projects_service.get_project(client, user_id, project_id)  # ownership / 404
    job = jobs_service.get_latest_job(client, project_id)
    chunks = chunks_service.list_chunks(client, project_id)
    generated = sum(1 for c in chunks if c.get("status") == "generated")
    failed = sum(1 for c in chunks if c.get("status") == "failed")
    return {
        "job": job,
        "total_chunks": len(chunks),
        "generated_chunks": generated,
        "failed_chunks": failed,
    }


# Re-export for route error handling.
__all__ = [
    "AppError",
    "chunk_status_summary",
    "final_audio_urls",
    "generate_preview",
    "process_job",
    "rebuild_final",
    "regenerate_chunk",
    "start_generation",
]
