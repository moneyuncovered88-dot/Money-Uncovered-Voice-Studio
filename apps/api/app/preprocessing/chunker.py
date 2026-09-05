"""Intelligent chunking for long-form narration.

We never split every N characters blindly. Preferred break points, in order:
    1. paragraph end
    2. sentence end
    3. clause boundary (, ; :)
    4. (last resort) word boundary

We never break inside a word, a decimal number, a monetary amount, a common
abbreviation, or an acronym where avoidable.
"""

from __future__ import annotations

import re

# Sentinel used to hide "protected" periods (decimals, abbreviations) from the
# sentence splitter, then restored afterwards.
_DOT = " DOT "

# Abbreviations that end with a period and should NOT end a sentence.
_ABBREVIATIONS = (
    "mr", "mrs", "ms", "dr", "prof", "sr", "jr", "st", "vs", "etc", "inc",
    "ltd", "co", "corp", "dept", "est", "fig", "vol", "no", "approx",
    "jan", "feb", "mar", "apr", "jun", "jul", "aug", "sep", "sept", "oct",
    "nov", "dec", "gov", "sen", "rep", "gen",
)

# Multi-dot abbreviations (internal periods), protected wholesale.
_DOTTED_ABBR = ("u.s.a", "u.s", "u.k", "e.g", "i.e", "a.m", "p.m", "d.c", "ph.d")

_ABBR_RE = re.compile(
    r"\b(" + "|".join(_ABBREVIATIONS) + r")\.",
    re.IGNORECASE,
)
_DECIMAL_RE = re.compile(r"(\d)\.(\d)")
_SENTENCE_SPLIT = re.compile(r"(?<=[.!?])\s+(?=[\"'(A-Z0-9])")
_CLAUSE_SPLIT = re.compile(r"(?<=[,;:])\s+")


def _paragraphs(text: str) -> list[str]:
    """Split into paragraphs; join soft line breaks within a paragraph."""
    out: list[str] = []
    for block in re.split(r"\n\s*\n", text):
        joined = " ".join(line.strip() for line in block.split("\n") if line.strip())
        if joined:
            out.append(joined)
    return out


def _protect(text: str) -> str:
    text = _DECIMAL_RE.sub(rf"\1{_DOT}\2", text)
    for abbr in _DOTTED_ABBR:
        # Protect internal dots of dotted abbreviations, case-insensitively.
        pattern = re.compile(re.escape(abbr).replace(r"\.", r"\."), re.IGNORECASE)
        text = pattern.sub(lambda m: m.group(0).replace(".", _DOT), text)
    text = _ABBR_RE.sub(lambda m: m.group(0).replace(".", _DOT), text)
    return text


def _restore(text: str) -> str:
    return text.replace(_DOT, ".")


def split_sentences(text: str) -> list[str]:
    """Split a paragraph into sentences, guarding decimals and abbreviations."""
    protected = _protect(text)
    parts = _SENTENCE_SPLIT.split(protected)
    return [_restore(p).strip() for p in parts if p.strip()]


def split_clauses(sentence: str) -> list[str]:
    """Split a long sentence at clause boundaries, keeping the delimiters."""
    parts = _CLAUSE_SPLIT.split(sentence)
    return [p.strip() for p in parts if p.strip()]


def _hard_split(text: str, max_chars: int) -> list[str]:
    """Last resort: split on word boundaries; only break a word if it alone
    exceeds max_chars (e.g. a very long URL)."""
    words = text.split(" ")
    pieces: list[str] = []
    current = ""
    for word in words:
        if len(word) > max_chars:
            if current:
                pieces.append(current)
                current = ""
            for i in range(0, len(word), max_chars):
                pieces.append(word[i : i + max_chars])
            continue
        candidate = word if not current else f"{current} {word}"
        if len(candidate) <= max_chars:
            current = candidate
        else:
            pieces.append(current)
            current = word
    if current:
        pieces.append(current)
    return pieces


def _units(text: str, max_chars: int) -> list[str]:
    """Break text into units that each fit within max_chars, preferring the
    highest-level natural boundary possible."""
    units: list[str] = []
    for para in _paragraphs(text):
        if len(para) <= max_chars:
            units.append(para)
            continue
        for sentence in split_sentences(para):
            if len(sentence) <= max_chars:
                units.append(sentence)
                continue
            for clause in split_clauses(sentence):
                if len(clause) <= max_chars:
                    units.append(clause)
                else:
                    units.extend(_hard_split(clause, max_chars))
    return units


def split_into_chunks(text: str, max_chars: int) -> list[str]:
    """Group natural units greedily into chunks no longer than max_chars.

    Because units are whole paragraphs/sentences/clauses, chunk boundaries
    always fall on natural break points.
    """
    if max_chars <= 0:
        raise ValueError("max_chars must be positive")
    text = (text or "").strip()
    if not text:
        return []

    chunks: list[str] = []
    current = ""
    for unit in _units(text, max_chars):
        if not current:
            current = unit
        elif len(current) + 1 + len(unit) <= max_chars:
            current = f"{current} {unit}"
        else:
            chunks.append(current)
            current = unit
    if current:
        chunks.append(current)
    return chunks
