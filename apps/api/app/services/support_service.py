"""Support tickets data access (user-scoped, graceful if table is absent)."""

from __future__ import annotations

from typing import Any

from supabase import Client

from app.errors import UpstreamError
from app.logging_config import get_logger

logger = get_logger("app.support")

_TABLE = "support_tickets"


def create_ticket(client: Client, user_id: str, topic: str | None, message: str) -> dict[str, Any]:
    try:
        res = (
            client.table(_TABLE)
            .insert({"user_id": user_id, "topic": topic, "message": message, "status": "open"})
            .execute()
        )
        return res.data[0] if res.data else {}
    except Exception as exc:  # noqa: BLE001 - table may not exist yet
        raise UpstreamError(
            "Support requests aren't available yet. Please try again later.",
            code="support_unavailable",
            status_code=503,
        ) from exc


def list_tickets(client: Client, user_id: str) -> list[dict[str, Any]]:
    try:
        return (
            client.table(_TABLE)
            .select("*")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .limit(50)
            .execute()
            .data
            or []
        )
    except Exception as exc:  # noqa: BLE001
        logger.debug("ticket list failed: %s", exc)
        return []
