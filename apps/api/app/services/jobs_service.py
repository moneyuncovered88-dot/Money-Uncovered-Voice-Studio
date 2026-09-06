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


def _age_seconds(row: dict[str, Any]) -> float | None:
    """Seconds since the job last moved. Uses updated_at, falling back to created_at."""
    raw = row.get("updated_at") or row.get("created_at")
    if not raw:
        return None
    try:
        ts = datetime.fromisoformat(str(raw).replace("Z", "+00:00"))
        if ts.tzinfo is None:
            ts = ts.replace(tzinfo=UTC)
        return (datetime.now(UTC) - ts).total_seconds()
    except ValueError:
        return None


def reclaim_stale_jobs(client: Client, project_id: str, max_age_seconds: int = 300) -> int:
    """Fail active jobs that have made no progress for a while.

    FastAPI background tasks don't survive a backend restart/redeploy, which
    leaves jobs stuck in an active status with nothing processing them. Those
    orphans otherwise block every retry, so we reclaim them here.
    """
    rows = (
        _exec(
            client.table(_TABLE)
            .select("*")
            .eq("project_id", project_id)
            .in_("status", list(ACTIVE_STATUSES))
        ).data
        or []
    )
    reclaimed = 0
    for row in rows:
        age = _age_seconds(row)
        if age is None or age > max_age_seconds:
            update_job(client, row["id"], {"status": "failed"})
            reclaimed += 1
    return reclaimed


def cancel_active_jobs(client: Client, project_id: str) -> int:
    """Mark all currently-active jobs for a project as cancelled."""
    rows = (
        _exec(
            client.table(_TABLE)
            .select("id")
            .eq("project_id", project_id)
            .in_("status", list(ACTIVE_STATUSES))
        ).data
        or []
    )
    for row in rows:
        update_job(client, row["id"], {"status": "cancelled"})
    return len(rows)


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
