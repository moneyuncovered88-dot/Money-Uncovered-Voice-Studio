"""Pronunciation dictionary application.

Safety is the priority: replacements must never corrupt unrelated words.
We therefore:
  * apply longer terms before shorter ones (so "S&P 500" wins over "S&P"),
  * by default require boundaries so "IRA" does not match inside "IRELAND",
  * treat the term literally (regex-escaped) — no accidental regex behavior.
"""

from __future__ import annotations

import re
from dataclasses import dataclass


@dataclass(frozen=True)
class PronunciationEntry:
    """One dictionary rule."""

    term: str
    spoken_form: str
    case_sensitive: bool = False
    whole_word: bool = True
    enabled: bool = True


def _compile(entry: PronunciationEntry) -> re.Pattern[str]:
    escaped = re.escape(entry.term)
    if entry.whole_word:
        # Boundaries that also work for terms containing symbols/spaces
        # (e.g. "S&P 500", "401(k)"): not flanked by an alphanumeric char.
        pattern = rf"(?<![A-Za-z0-9]){escaped}(?![A-Za-z0-9])"
    else:
        pattern = escaped
    flags = 0 if entry.case_sensitive else re.IGNORECASE
    return re.compile(pattern, flags)


def apply_pronunciations(text: str, entries: list[PronunciationEntry]) -> str:
    """Return text with all enabled pronunciation rules applied.

    Rules are applied longest-term-first. Each rule runs once over the text.
    """
    if not text or not entries:
        return text or ""

    active = [e for e in entries if e.enabled and e.term]
    # Longer terms first so multi-word phrases take precedence.
    active.sort(key=lambda e: len(e.term), reverse=True)

    result = text
    for entry in active:
        pattern = _compile(entry)
        # Use a function replacement so backslashes in spoken_form are literal.
        result = pattern.sub(lambda _m, s=entry.spoken_form: s, result)
    return result


def preview(text: str, entries: list[PronunciationEntry]) -> str:
    """Alias for apply_pronunciations, used by the dictionary preview UI."""
    return apply_pronunciations(text, entries)
