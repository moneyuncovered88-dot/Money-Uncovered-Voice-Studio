"""Pronunciation dictionary data access (user-scoped)."""

from __future__ import annotations

from typing import Any

from supabase import Client

from app.errors import NotFoundError, UpstreamError
from app.preprocessing.pronunciation import PronunciationEntry

_TABLE = "pronunciation_entries"


def _exec(query: Any) -> Any:
    try:
        return query.execute()
    except Exception as exc:  # supabase/postgrest raise various error types
        raise UpstreamError(f"Database error: {exc}", code="db_error") from exc


def list_entries(client: Client, user_id: str) -> list[dict[str, Any]]:
    res = _exec(
        client.table(_TABLE)
        .select("*")
        .eq("user_id", user_id)
        .order("term")
    )
    return res.data or []


def get_entry(client: Client, user_id: str, entry_id: str) -> dict[str, Any]:
    res = _exec(
        client.table(_TABLE)
        .select("*")
        .eq("id", entry_id)
        .eq("user_id", user_id)
        .limit(1)
    )
    rows = res.data or []
    if not rows:
        raise NotFoundError("Pronunciation entry not found")
    return rows[0]


def create_entry(client: Client, user_id: str, data: dict[str, Any]) -> dict[str, Any]:
    payload = {**data, "user_id": user_id}
    res = _exec(client.table(_TABLE).insert(payload))
    return (res.data or [{}])[0]


def update_entry(
    client: Client, user_id: str, entry_id: str, data: dict[str, Any]
) -> dict[str, Any]:
    get_entry(client, user_id, entry_id)  # ownership check / 404
    res = _exec(
        client.table(_TABLE)
        .update(data)
        .eq("id", entry_id)
        .eq("user_id", user_id)
    )
    return (res.data or [{}])[0]


def delete_entry(client: Client, user_id: str, entry_id: str) -> None:
    get_entry(client, user_id, entry_id)  # 404 if missing
    _exec(
        client.table(_TABLE)
        .delete()
        .eq("id", entry_id)
        .eq("user_id", user_id)
    )


def load_active_entries(client: Client, user_id: str) -> list[PronunciationEntry]:
    """Return enabled dictionary rules as preprocessing entries."""
    rows = _exec(
        client.table(_TABLE)
        .select("term, spoken_form, case_sensitive, whole_word, enabled")
        .eq("user_id", user_id)
        .eq("enabled", True)
    ).data or []
    return [
        PronunciationEntry(
            term=r["term"],
            spoken_form=r["spoken_form"],
            case_sensitive=bool(r.get("case_sensitive", False)),
            whole_word=bool(r.get("whole_word", True)),
            enabled=True,
        )
        for r in rows
    ]
