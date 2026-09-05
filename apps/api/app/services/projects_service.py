"""Project data access + script analysis (user-scoped)."""

from __future__ import annotations

from typing import Any

from supabase import Client

from app.config import get_settings
from app.errors import NotFoundError, UpstreamError
from app.preprocessing.pipeline import preprocess
from app.services.presets import get_preset
from app.services.pronunciations_service import load_active_entries
from app.utils.slug import slugify

_TABLE = "projects"

_LIST_COLUMNS = (
    "id, title, video_title, slug, status, voice_profile_id, "
    "word_count, estimated_duration_seconds, final_duration_seconds, "
    "created_at, updated_at"
)

# Fields whose change requires re-analyzing the script.
_ANALYSIS_TRIGGERS = {"script_original", "narration_preset", "speak_headings"}


def _exec(query: Any) -> Any:
    try:
        return query.execute()
    except Exception as exc:
        raise UpstreamError(f"Database error: {exc}", code="db_error") from exc


def analyze_script(
    client: Client,
    user_id: str,
    *,
    script: str,
    narration_preset: str | None = None,
    speak_headings: bool = False,
) -> dict[str, Any]:
    """Analyze a script (stats + chunk count) without persisting anything."""
    settings = get_settings()
    preset = get_preset(narration_preset)
    entries = load_active_entries(client, user_id)
    result = preprocess(
        script or "",
        entries=entries,
        max_chunk_chars=settings.tts_max_chunk_chars,
        speak_headings=speak_headings,
        words_per_minute=preset.words_per_minute,
    )
    return {
        "word_count": result.word_count,
        "character_count": result.character_count,
        "estimated_duration_seconds": result.estimated_duration_seconds,
        "chunk_count": result.chunk_count,
    }


def _apply_analysis(client: Client, user_id: str, payload: dict[str, Any]) -> dict[str, Any]:
    settings = get_settings()
    preset = get_preset(payload.get("narration_preset"))
    entries = load_active_entries(client, user_id)
    result = preprocess(
        payload.get("script_original") or "",
        entries=entries,
        max_chunk_chars=settings.tts_max_chunk_chars,
        speak_headings=bool(payload.get("speak_headings", False)),
        words_per_minute=preset.words_per_minute,
    )
    payload["script_processed"] = result.processed_text
    payload["word_count"] = result.word_count
    payload["character_count"] = result.character_count
    payload["estimated_duration_seconds"] = result.estimated_duration_seconds
    payload["model_name"] = settings.model_name
    return payload


def list_projects(client: Client, user_id: str) -> list[dict[str, Any]]:
    res = _exec(
        client.table(_TABLE)
        .select(_LIST_COLUMNS)
        .eq("user_id", user_id)
        .order("updated_at", desc=True)
    )
    return res.data or []


def get_project(client: Client, user_id: str, project_id: str) -> dict[str, Any]:
    res = _exec(
        client.table(_TABLE)
        .select("*")
        .eq("id", project_id)
        .eq("user_id", user_id)
        .limit(1)
    )
    rows = res.data or []
    if not rows:
        raise NotFoundError("Project not found")
    return rows[0]


def create_project(client: Client, user_id: str, data: dict[str, Any]) -> dict[str, Any]:
    payload: dict[str, Any] = dict(data)
    payload["slug"] = slugify(payload.get("title", "untitled"))
    payload = _apply_analysis(client, user_id, payload)
    payload["user_id"] = user_id
    res = _exec(client.table(_TABLE).insert(payload))
    return (res.data or [{}])[0]


def update_project(
    client: Client, user_id: str, project_id: str, changes: dict[str, Any]
) -> dict[str, Any]:
    existing = get_project(client, user_id, project_id)

    payload = {k: v for k, v in changes.items() if v is not None}
    if "title" in payload:
        payload["slug"] = slugify(payload["title"])

    if _ANALYSIS_TRIGGERS & payload.keys():
        merged = {**existing, **payload}
        analysis = _apply_analysis(
            client,
            user_id,
            {
                "script_original": merged.get("script_original", ""),
                "narration_preset": merged.get("narration_preset"),
                "speak_headings": merged.get("speak_headings", False),
            },
        )
        payload.update(
            {
                "script_processed": analysis["script_processed"],
                "word_count": analysis["word_count"],
                "character_count": analysis["character_count"],
                "estimated_duration_seconds": analysis["estimated_duration_seconds"],
                "model_name": analysis["model_name"],
            }
        )

    if not payload:
        return existing

    res = _exec(
        client.table(_TABLE)
        .update(payload)
        .eq("id", project_id)
        .eq("user_id", user_id)
    )
    return (res.data or [{}])[0]


def delete_project(client: Client, user_id: str, project_id: str) -> None:
    get_project(client, user_id, project_id)
    _exec(
        client.table(_TABLE)
        .delete()
        .eq("id", project_id)
        .eq("user_id", user_id)
    )
