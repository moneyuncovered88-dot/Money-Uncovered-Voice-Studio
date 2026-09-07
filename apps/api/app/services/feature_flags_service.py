"""Feature flags (global, admin-managed). Graceful if the table is absent."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from supabase import Client

from app.logging_config import get_logger

logger = get_logger("app.flags")

_TABLE = "feature_flags"

# Known flags surfaced in the admin UI (shown even before first write).
KNOWN_FLAGS = {
    "ads_enabled": "Show ads to free users",
    "signups_enabled": "Allow new account signups",
    "generation_enabled": "Allow audio generation (kill switch)",
}


def list_flags(client: Client) -> list[dict[str, Any]]:
    stored: dict[str, dict[str, Any]] = {}
    try:
        rows = client.table(_TABLE).select("*").execute().data or []
        stored = {r["key"]: r for r in rows}
    except Exception as exc:  # noqa: BLE001
        logger.debug("feature flag list failed: %s", exc)
    out = []
    for key, label in KNOWN_FLAGS.items():
        row = stored.get(key)
        out.append(
            {
                "key": key,
                "label": label,
                "enabled": bool(row["enabled"]) if row else _default_enabled(key),
                "value": row.get("value") if row else None,
            }
        )
    return out


def _default_enabled(key: str) -> bool:
    # Sensible defaults when no row exists yet.
    return key in ("signups_enabled", "generation_enabled")


def set_flag(client: Client, key: str, enabled: bool) -> dict[str, Any]:
    payload = {"key": key, "enabled": enabled, "updated_at": datetime.now(UTC).isoformat()}
    client.table(_TABLE).upsert(payload).execute()
    return payload


def is_enabled(client: Client, key: str, default: bool) -> bool:
    try:
        rows = client.table(_TABLE).select("enabled").eq("key", key).limit(1).execute().data or []
        return bool(rows[0]["enabled"]) if rows else default
    except Exception:  # noqa: BLE001
        return default
