"""Chunk timeline math.

Given per-chunk durations and the pauses inserted between them, compute each
chunk's start and end position in the final narration. Stored as metadata so we
can later generate subtitles and scene timestamps without re-analyzing audio.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class TimelineEntry:
    index: int
    start_seconds: float
    end_seconds: float
    duration_seconds: float


def build_timeline(
    durations: list[float],
    *,
    lead_in_seconds: float = 0.0,
    gap_seconds: float = 0.0,
) -> list[TimelineEntry]:
    """Compute cumulative start/end positions for a list of chunk durations.

    `gap_seconds` is the pause inserted between consecutive chunks.
    """
    cursor = max(0.0, lead_in_seconds)
    entries: list[TimelineEntry] = []
    for index, duration in enumerate(durations):
        duration = max(0.0, float(duration))
        start = cursor
        end = start + duration
        entries.append(
            TimelineEntry(
                index=index,
                start_seconds=round(start, 3),
                end_seconds=round(end, 3),
                duration_seconds=round(duration, 3),
            )
        )
        cursor = end + max(0.0, gap_seconds)
    return entries


def total_duration(entries: list[TimelineEntry]) -> float:
    """Total narration length including the final chunk (excludes trailing gap)."""
    return round(entries[-1].end_seconds, 3) if entries else 0.0
