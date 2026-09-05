"""Whitespace / punctuation normalization and stage-direction handling.

Conservative on purpose: we clean up obviously-broken spacing and unify a few
unicode punctuation variants, but we do not rewrite the author's wording.
"""

from __future__ import annotations

import re

# Unicode punctuation -> ASCII equivalents that TTS engines read cleanly.
_PUNCT_MAP = {
    "‘": "'",   # left single quote
    "’": "'",   # right single quote / apostrophe
    "“": '"',   # left double quote
    "”": '"',   # right double quote
    "–": "-",   # en dash
    "—": "-",   # em dash
    "…": "...",  # ellipsis
    " ": " ",   # non-breaking space
    "​": "",    # zero-width space
    "‑": "-",   # non-breaking hyphen
}

# Non-spoken stage directions, e.g. [PAUSE], [LONG PAUSE], [SECTION].
_STAGE_DIRECTION = re.compile(r"\[[^\]\n]{0,40}\]")

# A heading line: short, mostly uppercase, optional trailing number.
# e.g. "INTRO", "SECTION 1", "CHAPTER 2", "CONCLUSION".
_HEADING = re.compile(r"^\s*[A-Z][A-Z0-9 .:'&-]{1,40}\s*$")

_MULTISPACE = re.compile(r"[ \t]+")
_MULTINEWLINE = re.compile(r"\n{3,}")


def normalize_whitespace(text: str) -> str:
    """Collapse runs of spaces/tabs, trim line ends, cap blank lines at one."""
    if not text:
        return ""
    # Unify line endings.
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    # Collapse spaces/tabs.
    text = _MULTISPACE.sub(" ", text)
    # Strip trailing spaces on each line.
    text = "\n".join(line.strip() for line in text.split("\n"))
    # Collapse 3+ newlines to a single blank line (paragraph break).
    text = _MULTINEWLINE.sub("\n\n", text)
    return text.strip()


def normalize_punctuation(text: str) -> str:
    """Map fancy unicode punctuation to ASCII the TTS engine reads reliably."""
    if not text:
        return ""
    for src, dst in _PUNCT_MAP.items():
        text = text.replace(src, dst)
    return text


def strip_stage_directions(text: str) -> str:
    """Remove bracketed non-spoken annotations like [PAUSE].

    (Mapping directions to real silences is handled later in audio assembly.)
    """
    if not text:
        return ""
    cleaned = _STAGE_DIRECTION.sub(" ", text)
    # Tidy any double spaces introduced by removal.
    return _MULTISPACE.sub(" ", cleaned)


def is_heading(line: str) -> bool:
    """True if a line looks like a section heading rather than prose."""
    stripped = line.strip()
    if not stripped or " " not in stripped and len(stripped) < 3:
        return False
    if stripped.endswith((".", "!", "?")):
        return False
    # Must contain letters and be predominantly uppercase.
    letters = [c for c in stripped if c.isalpha()]
    if not letters:
        return False
    upper_ratio = sum(1 for c in letters if c.isupper()) / len(letters)
    return bool(_HEADING.match(stripped)) and upper_ratio >= 0.8


def remove_headings(text: str) -> str:
    """Drop heading-only lines (used when 'speak headings' is off)."""
    kept = [line for line in text.split("\n") if not is_heading(line)]
    return _MULTINEWLINE.sub("\n\n", "\n".join(kept)).strip()
