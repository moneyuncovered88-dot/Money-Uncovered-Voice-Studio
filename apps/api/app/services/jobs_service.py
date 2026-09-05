"""generation_jobs data access."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from supabase import Client

from app.errors import UpstreamError

_TABLE = "generation_jobs"

# Statuses that mean a job is still doing work.
ACTIVE_STATUSES = ("queued", "preprocessing", "generating", "assembling", "normalizing", "uploading")


def _exec(query: Any) -> Any:
    try:
        return query.execute()
    except Exception as exc:
        raise UpstreamError(f"Database error: {exc}", code="db_error") from exc


def create_job(client: Client, data: dict[str, Any]) -> dict[str, Any]:
    payload = {**data, "started_at": datetime.now(UTC).isoformat()}
    res = _exec(client.table(_TABLE).insert(payload))
    return (res.data or [{}])[0]


def update_job(client: Client, job_id: str, data: dict[str, Any]) -> dict[str, Any]:
    res = _exec(client.table(_TABLE).update(data).eq("id", job_id))
    return (res.data or [{}])[0]


def get_job(client: Client, user_id: str, job_id: str) -> dict[str, Any] | None:
    rows = _exec(
        client.table(_TABLE).select("*").eq("id", job_id).eq("user_id", user_id).limit(1)
    ).data or []
    return rows[0] if rows else None


def get_active_job(client: Client, project_id: str) -> dict[str, Any] | None:
    rows = _exec(
        client.table(_TABLE)
        .select("*")
        .eq("project_id", project_id)
        .in_("status", list(ACTIVE_STATUSES))
        .order("created_at", desc=True)
        .limit(1)
    ).data or []
    return rows[0] if rows else None


def get_latest_job(client: Client, project_id: str) -> dict[str, Any] | None:
    rows = _exec(
        client.table(_TABLE)
        .select("*")
        .eq("project_id", project_id)
        .order("created_at", desc=True)
        .limit(1)
    ).data or []
    return rows[0] if rows else None


def list_jobs(client: Client, user_id: str, limit: int = 50) -> list[dict[str, Any]]:
    return _exec(
        client.table(_TABLE)
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .limit(limit)
    ).data or []
