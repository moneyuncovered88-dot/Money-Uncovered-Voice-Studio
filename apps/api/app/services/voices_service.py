"""Voice profile data access (user-scoped)."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from supabase import Client

from app.errors import NotFoundError, UpstreamError

_TABLE = "voice_profiles"


def _exec(query: Any) -> Any:
    try:
        return query.execute()
    except Exception as exc:
        raise UpstreamError(f"Database error: {exc}", code="db_error") from exc


def list_voices(client: Client, user_id: str) -> list[dict[str, Any]]:
    res = _exec(
        client.table(_TABLE)
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
    )
    return res.data or []


def get_voice(client: Client, user_id: str, voice_id: str) -> dict[str, Any]:
    res = _exec(
        client.table(_TABLE)
        .select("*")
        .eq("id", voice_id)
        .eq("user_id", user_id)
        .limit(1)
    )
    rows = res.data or []
    if not rows:
        raise NotFoundError("Voice not found")
    return rows[0]


def create_voice(client: Client, user_id: str, data: dict[str, Any]) -> dict[str, Any]:
    payload = {
        **data,
        "user_id": user_id,
        "authorization_confirmed_at": datetime.now(UTC).isoformat(),
    }
    res = _exec(client.table(_TABLE).insert(payload))
    return (res.data or [{}])[0]


def update_voice(
    client: Client, user_id: str, voice_id: str, data: dict[str, Any]
) -> dict[str, Any]:
    get_voice(client, user_id, voice_id)
    res = _exec(
        client.table(_TABLE)
        .update(data)
        .eq("id", voice_id)
        .eq("user_id", user_id)
    )
    return (res.data or [{}])[0]


def delete_voice(client: Client, user_id: str, voice_id: str) -> None:
    get_voice(client, user_id, voice_id)
    _exec(
        client.table(_TABLE)
        .delete()
        .eq("id", voice_id)
        .eq("user_id", user_id)
    )
