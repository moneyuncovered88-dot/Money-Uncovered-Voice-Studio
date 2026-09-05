"""Slug and safe-filename helpers.

Slugs are for human-friendly URLs and export filenames only. Internal
identifiers are always UUIDs — never depend on a slug as a key.
"""

from __future__ import annotations

import re
import unicodedata

_NON_SLUG = re.compile(r"[^a-z0-9]+")
_UNSAFE_FILENAME = re.compile(r"[^A-Za-z0-9._-]+")


def slugify(value: str, *, max_length: int = 80) -> str:
    """Turn arbitrary text into a lowercase, hyphen-separated slug."""
    normalized = unicodedata.normalize("NFKD", value)
    ascii_text = normalized.encode("ascii", "ignore").decode("ascii")
    slug = _NON_SLUG.sub("-", ascii_text.lower()).strip("-")
    if len(slug) > max_length:
        slug = slug[:max_length].rstrip("-")
    return slug or "untitled"


def safe_filename(value: str, *, extension: str | None = None, max_length: int = 120) -> str:
    """Produce a filesystem/storage-safe filename (no path traversal)."""
    normalized = unicodedata.normalize("NFKD", value)
    ascii_text = normalized.encode("ascii", "ignore").decode("ascii")
    base = _UNSAFE_FILENAME.sub("-", ascii_text).strip("-._") or "file"
    if len(base) > max_length:
        base = base[:max_length].rstrip("-._")
    if extension:
        ext = extension.lstrip(".")
        return f"{base}.{ext}"
    return base
