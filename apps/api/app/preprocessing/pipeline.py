"""End-to-end script preprocessing.

Produces the processed (spoken) text and the ordered list of generation
chunks, plus stats. The original script is always preserved separately by the
caller — this module never mutates the input.
"""

from __future__ import annotations

from dataclasses import dataclass, field

from app.preprocessing import normalize, text_stats
from app.preprocessing.chunker import split_into_chunks
from app.preprocessing.pronunciation import PronunciationEntry, apply_pronunciations


@dataclass
class PreprocessResult:
    processed_text: str
    chunks: list[str] = field(default_factory=list)
    word_count: int = 0
    character_count: int = 0
    estimated_duration_seconds: float = 0.0
    chunk_count: int = 0


def preprocess(
    raw_text: str,
    *,
    entries: list[PronunciationEntry] | None = None,
    max_chunk_chars: int = 600,
    speak_headings: bool = False,
    words_per_minute: int = 150,
) -> PreprocessResult:
    """Run the full preprocessing pipeline over a raw script."""
    entries = entries or []

    text = normalize.normalize_whitespace(raw_text)
    text = normalize.normalize_punctuation(text)
    text = normalize.strip_stage_directions(text)
    if not speak_headings:
        text = normalize.remove_headings(text)
    # Re-tidy whitespace after removals.
    text = normalize.normalize_whitespace(text)

    processed = apply_pronunciations(text, entries)

    chunks = split_into_chunks(processed, max_chunk_chars)

    words = text_stats.count_words(processed)
    return PreprocessResult(
        processed_text=processed,
        chunks=chunks,
        word_count=words,
        character_count=text_stats.count_characters(processed),
        estimated_duration_seconds=text_stats.estimate_duration_seconds(words, words_per_minute),
        chunk_count=len(chunks),
    )
