"""Usage tracking + plan enforcement.

New SaaS tables (`user_subscriptions`, `usage_ledger`) may not exist yet in a
given environment. Every read here degrades gracefully: if a table is missing
or a query fails, we fall back to the Free plan and zero usage so existing
features keep working. Enforcement fails *open* for the same reason — quotas
only bite once the tables are in place.
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from supabase import Client

from app.errors import QuotaError
from app.logging_config import get_logger
from app.services import plans

logger = get_logger("app.usage")

_SUBS = "user_subscriptions"
_LEDGER = "usage_ledger"
_VOICES = "voice_profiles"
_PROJECTS = "projects"

# Ledger kinds
CHARACTERS = "characters"
MINUTES = "minutes"
JOBS = "jobs"


def _period_start(now: datetime | None = None) -> datetime:
    now = now or datetime.now(UTC)
    return now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)


def _next_reset(now: datetime | None = None) -> datetime:
    start = _period_start(now)
    year, month = start.year, start.month
    return start.replace(year=year + 1, month=1) if month == 12 else start.replace(month=month + 1)


def get_plan_key(client: Client, user_id: str) -> str:
    try:
        rows = (
            client.table(_SUBS)
            .select("plan,status")
            .eq("user_id", user_id)
            .limit(1)
            .execute()
            .data
            or []
        )
    except Exception as exc:  # noqa: BLE001 - table may not exist yet
        logger.debug("subscriptions lookup failed (defaulting to free): %s", exc)
        return plans.DEFAULT_PLAN_KEY
    if not rows:
        return plans.DEFAULT_PLAN_KEY
    row = rows[0]
    status = (row.get("status") or "active").lower()
    if status not in ("active", "trialing"):
        return plans.DEFAULT_PLAN_KEY
    return row.get("plan") or plans.DEFAULT_PLAN_KEY


def get_plan(client: Client, user_id: str) -> plans.Plan:
    return plans.get_plan(get_plan_key(client, user_id))


def record_usage(
    client: Client,
    user_id: str,
    kind: str,
    amount: float,
    *,
    project_id: str | None = None,
    job_id: str | None = None,
) -> None:
    """Best-effort ledger insert. Never raises — usage tracking must not break generation."""
    try:
        client.table(_LEDGER).insert(
            {
                "user_id": user_id,
                "kind": kind,
                "amount": amount,
                "project_id": project_id,
                "job_id": job_id,
            }
        ).execute()
    except Exception as exc:  # noqa: BLE001
        logger.debug("usage ledger insert skipped (%s=%s): %s", kind, amount, exc)


def _sum_ledger(client: Client, user_id: str, kind: str) -> float:
    try:
        rows = (
            client.table(_LEDGER)
            .select("amount")
            .eq("user_id", user_id)
            .eq("kind", kind)
            .gte("created_at", _period_start().isoformat())
            .execute()
            .data
            or []
        )
    except Exception as exc:  # noqa: BLE001
        logger.debug("ledger sum failed (%s): %s", kind, exc)
        return 0.0
    return float(sum(float(r.get("amount") or 0) for r in rows))


def _count(client: Client, table: str, user_id: str) -> int:
    try:
        res = (
            client.table(table)
            .select("id", count="exact")
            .eq("user_id", user_id)
            .execute()
        )
        return int(getattr(res, "count", None) or len(res.data or []))
    except Exception as exc:  # noqa: BLE001
        logger.debug("count failed (%s): %s", table, exc)
        return 0


def period_usage(client: Client, user_id: str) -> dict[str, Any]:
    chars = _sum_ledger(client, user_id, CHARACTERS)
    minutes = _sum_ledger(client, user_id, MINUTES)
    jobs = _sum_ledger(client, user_id, JOBS)
    return {
        "characters": int(chars),
        "minutes": round(minutes, 2),
        "jobs": int(jobs),
        "projects": _count(client, _PROJECTS, user_id),
        "voices": _count(client, _VOICES, user_id),
    }


def usage_summary(client: Client, user_id: str) -> dict[str, Any]:
    plan = get_plan(client, user_id)
    used = period_usage(client, user_id)
    quota = plan.monthly_char_quota
    remaining = max(0, quota - used["characters"])
    pct = round(min(100.0, used["characters"] / quota * 100), 1) if quota > 0 else 0.0
    return {
        "plan": plan.to_public(),
        "usage": used,
        "quota": {
            "characters": quota,
            "characters_used": used["characters"],
            "characters_remaining": remaining,
            "percent_used": pct,
        },
        "ads_enabled": plan.ads,
        "period_start": _period_start().isoformat(),
        "next_reset": _next_reset().isoformat(),
    }


# --- Enforcement (fails open when tables are absent) -------------------------


def ensure_can_generate(client: Client, user_id: str, char_count: int) -> None:
    plan = get_plan(client, user_id)
    used = _sum_ledger(client, user_id, CHARACTERS)
    if used + char_count > plan.monthly_char_quota:
        remaining = max(0, plan.monthly_char_quota - int(used))
        raise QuotaError(
            f"This narration needs {char_count:,} characters but only {remaining:,} remain "
            f"on your {plan.name} plan this month. Upgrade for a higher quota.",
        )


def ensure_can_preview(client: Client, user_id: str, char_count: int) -> None:
    plan = get_plan(client, user_id)
    if char_count > plan.preview_max_chars:
        raise QuotaError(
            f"Previews on the {plan.name} plan are limited to {plan.preview_max_chars:,} "
            f"characters. Trim the preview text or upgrade.",
        )


def ensure_can_add_voice(client: Client, user_id: str) -> None:
    plan = get_plan(client, user_id)
    if plan.max_voices < 0:
        return
    count = _count(client, _VOICES, user_id)
    if count >= plan.max_voices:
        raise QuotaError(
            f"The {plan.name} plan allows {plan.max_voices} voice "
            f"profile{'s' if plan.max_voices != 1 else ''}. Upgrade to add more.",
        )
