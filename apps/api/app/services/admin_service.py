"""Admin aggregations across all users (service-role client bypasses RLS)."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from supabase import Client

from app.logging_config import get_logger
from app.services import plans

logger = get_logger("app.admin")


def _count(client: Client, table: str, filters: list[tuple[str, str]] | None = None) -> int:
    try:
        q = client.table(table).select("id", count="exact")
        for col, val in filters or []:
            q = q.eq(col, val)
        res = q.execute()
        return int(getattr(res, "count", None) or len(res.data or []))
    except Exception as exc:  # noqa: BLE001
        logger.debug("admin count failed (%s): %s", table, exc)
        return 0


def _day_start_iso() -> str:
    return datetime.now(UTC).replace(hour=0, minute=0, second=0, microsecond=0).isoformat()


def overview(client: Client) -> dict[str, Any]:
    # Jobs
    active_statuses = ["queued", "preprocessing", "generating", "assembling", "normalizing", "uploading"]
    active_jobs = 0
    failed_today = 0
    completed = 0
    gpu_seconds = 0.0
    est_cost = 0.0
    try:
        jobs = (
            client.table("generation_jobs")
            .select("status,gpu_seconds,estimated_cost,created_at")
            .order("created_at", desc=True)
            .limit(2000)
            .execute()
            .data
            or []
        )
        day = _day_start_iso()
        for j in jobs:
            st = j.get("status")
            if st in active_statuses:
                active_jobs += 1
            elif st == "completed":
                completed += 1
            elif st == "failed" and (j.get("created_at") or "") >= day:
                failed_today += 1
            gpu_seconds += float(j.get("gpu_seconds") or 0)
            est_cost += float(j.get("estimated_cost") or 0)
    except Exception as exc:  # noqa: BLE001
        logger.debug("admin jobs agg failed: %s", exc)

    # Subscriptions -> plan distribution + monthly revenue estimate
    plan_counts: dict[str, int] = {}
    revenue = 0
    try:
        subs = client.table("user_subscriptions").select("plan,status").execute().data or []
        for s in subs:
            if (s.get("status") or "active") not in ("active", "trialing"):
                continue
            key = s.get("plan") or "free"
            plan_counts[key] = plan_counts.get(key, 0) + 1
            revenue += plans.get_plan(key).price_monthly
    except Exception as exc:  # noqa: BLE001
        logger.debug("admin subs agg failed: %s", exc)

    return {
        "jobs": {
            "active": active_jobs,
            "failed_today": failed_today,
            "completed": completed,
            "gpu_seconds": round(gpu_seconds, 1),
            "estimated_cost": round(est_cost, 4),
        },
        "content": {
            "projects": _count(client, "projects"),
            "voices": _count(client, "voice_profiles"),
        },
        "plan_distribution": plan_counts,
        "monthly_revenue_estimate": revenue,
        "open_tickets": _count(client, "support_tickets", [("status", "open")]),
    }


def recent_jobs(client: Client, status: str | None = None, limit: int = 50) -> list[dict[str, Any]]:
    try:
        q = (
            client.table("generation_jobs")
            .select("id,user_id,project_id,status,total_chunks,gpu_seconds,estimated_cost,created_at,completed_at")
            .order("created_at", desc=True)
            .limit(limit)
        )
        if status:
            q = q.eq("status", status)
        return q.execute().data or []
    except Exception as exc:  # noqa: BLE001
        logger.debug("admin recent_jobs failed: %s", exc)
        return []


def users(client: Client, limit: int = 100) -> list[dict[str, Any]]:
    """List users via the Auth admin API, joined with their plan."""
    plan_by_user: dict[str, str] = {}
    try:
        subs = client.table("user_subscriptions").select("user_id,plan,status").execute().data or []
        for s in subs:
            plan_by_user[s["user_id"]] = s.get("plan") or "free"
    except Exception as exc:  # noqa: BLE001
        logger.debug("admin users subs failed: %s", exc)

    out: list[dict[str, Any]] = []
    try:
        result = client.auth.admin.list_users()
        # supabase-py may return a list or an object with `.users`.
        raw = getattr(result, "users", result) or []
        for u in raw[:limit]:
            uid = getattr(u, "id", None)
            if uid is None:
                continue
            out.append(
                {
                    "id": uid,
                    "email": getattr(u, "email", None),
                    "created_at": str(getattr(u, "created_at", "") or ""),
                    "last_sign_in_at": str(getattr(u, "last_sign_in_at", "") or ""),
                    "plan": plan_by_user.get(uid, "free"),
                }
            )
    except Exception as exc:  # noqa: BLE001
        logger.debug("admin list_users failed: %s", exc)
    return out


def tickets(client: Client, limit: int = 100) -> list[dict[str, Any]]:
    try:
        return (
            client.table("support_tickets")
            .select("*")
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
            .data
            or []
        )
    except Exception as exc:  # noqa: BLE001
        logger.debug("admin tickets failed: %s", exc)
        return []
