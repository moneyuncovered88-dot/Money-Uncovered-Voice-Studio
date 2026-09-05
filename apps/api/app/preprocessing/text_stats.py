"""Word/character counts and narration duration estimates."""

from __future__ import annotations

import re

_WORD = re.compile(r"\b[\w'-]+\b", re.UNICODE)


def count_words(text: str) -> int:
    """Count word-like tokens (handles contractions and hyphenated words)."""
    return len(_WORD.findall(text or ""))


def count_characters(text: str) -> int:
    """Count characters (including spaces) in the given text."""
    return len(text or "")


def estimate_duration_seconds(word_count: int, words_per_minute: int = 150) -> float:
    """Estimate narration duration in seconds.

    This is an estimate only. Real duration comes from generated audio.
    """
    if words_per_minute <= 0:
        raise ValueError("words_per_minute must be positive")
    return round(word_count / words_per_minute * 60.0, 2)
