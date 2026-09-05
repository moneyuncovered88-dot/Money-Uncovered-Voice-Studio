"""project_chunks data access + chunk planning."""

from __future__ import annotations

from typing import Any

from supabase import Client

from app.errors import NotFoundError, UpstreamError

_TABLE = "project_chunks"


def _exec(query: Any) -> Any:
    try:
        return query.execute()
    except Exception as exc:
        raise UpstreamError(f"Database error: {exc}", code="db_error") from exc


def plan_reuse(existing_texts: list[str], new_texts: list[str]) -> bool:
    """True if existing chunks can be reused (same count + identical text).

    Pure helper so resume logic is unit-testable without a database.
    """
    return existing_texts == new_texts


def list_chunks(client: Client, project_id: str) -> list[dict[str, Any]]:
    return _exec(
        client.table(_TABLE).select("*").eq("project_id", project_id).order("chunk_index")
    ).data or []


def get_chunk(client: Client, chunk_id: str) -> dict[str, Any]:
    rows = _exec(client.table(_TABLE).select("*").eq("id", chunk_id).limit(1)).data or []
    if not rows:
        raise NotFoundError("Chunk not found")
    return rows[0]


def replace_chunks(client: Client, project_id: str, texts: list[str]) -> list[dict[str, Any]]:
    """Delete existing chunks and insert fresh `waiting` chunks for `texts`."""
    _exec(client.table(_TABLE).delete().eq("project_id", project_id))
    if not texts:
        return []
    rows = [
        {
            "project_id": project_id,
            "chunk_index": i,
            "original_text": text,
            "processed_text": text,
            "status": "waiting",
        }
        for i, text in enumerate(texts)
    ]
    _exec(client.table(_TABLE).insert(rows))
    return list_chunks(client, project_id)


def update_chunk(client: Client, chunk_id: str, data: dict[str, Any]) -> dict[str, Any]:
    res = _exec(client.table(_TABLE).update(data).eq("id", chunk_id))
    return (res.data or [{}])[0]
