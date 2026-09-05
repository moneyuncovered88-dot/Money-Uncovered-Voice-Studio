"""Supabase Storage helpers (private buckets + signed URLs).

The backend uses the service-role client, so uploads/signed URLs work
regardless of RLS. Paths are always prefixed with the owning user's id
(`<user_id>/...`) to match the storage policies in 0003_storage.sql.
"""

from __future__ import annotations

from supabase import Client

from app.errors import UpstreamError

VOICE_REFERENCES_BUCKET = "voice-references"
GENERATED_CHUNKS_BUCKET = "generated-chunks"
FINAL_AUDIO_BUCKET = "final-audio"


def upload_bytes(
    client: Client,
    bucket: str,
    path: str,
    data: bytes,
    content_type: str,
    *,
    upsert: bool = True,
) -> None:
    """Upload raw bytes to a bucket, overwriting by default."""
    try:
        client.storage.from_(bucket).upload(
            path,
            data,
            {"content-type": content_type, "upsert": "true" if upsert else "false"},
        )
    except Exception as exc:
        raise UpstreamError(f"Storage upload failed: {exc}", code="storage_error") from exc


def create_signed_url(client: Client, bucket: str, path: str, expires_in: int) -> str:
    """Return a time-limited signed URL for a private object."""
    try:
        res = client.storage.from_(bucket).create_signed_url(path, expires_in)
    except Exception as exc:
        raise UpstreamError(f"Could not sign URL: {exc}", code="storage_error") from exc
    # storage3 returns {"signedURL": ...}; tolerate casing variants.
    url = res.get("signedURL") or res.get("signedUrl") or res.get("signed_url")
    if not url:
        raise UpstreamError("Signed URL missing from storage response", code="storage_error")
    return url


def remove(client: Client, bucket: str, path: str) -> None:
    """Delete an object; ignore if it's already gone."""
    try:
        client.storage.from_(bucket).remove([path])
    except Exception as exc:  # deletion is best-effort
        raise UpstreamError(f"Storage delete failed: {exc}", code="storage_error") from exc
