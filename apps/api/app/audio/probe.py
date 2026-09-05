"""Best-effort audio metadata probing for uploaded reference recordings.

WAV is read with the stdlib. Other formats are probed with `ffprobe` when it
is available (it is in the backend Docker image). If probing isn't possible,
we return (None, None) rather than failing the upload.
"""

from __future__ import annotations

import io
import json
import shutil
import subprocess
import wave


def probe_wav_bytes(data: bytes) -> tuple[float | None, int | None]:
    """Return (duration_seconds, sample_rate) for WAV bytes, or (None, None)."""
    try:
        with wave.open(io.BytesIO(data), "rb") as wav:
            frames = wav.getnframes()
            rate = wav.getframerate()
            if rate <= 0:
                return None, None
            return round(frames / float(rate), 3), rate
    except Exception:
        return None, None


def probe_with_ffprobe(path: str) -> tuple[float | None, int | None]:
    """Return (duration_seconds, sample_rate) via ffprobe, or (None, None)."""
    if shutil.which("ffprobe") is None:
        return None, None
    try:
        out = subprocess.run(
            [
                "ffprobe",
                "-v",
                "error",
                "-select_streams",
                "a:0",
                "-show_entries",
                "stream=sample_rate:format=duration",
                "-of",
                "json",
                path,
            ],
            capture_output=True,
            text=True,
            timeout=30,
            check=True,
        )
        payload = json.loads(out.stdout or "{}")
        duration = payload.get("format", {}).get("duration")
        streams = payload.get("streams") or [{}]
        sample_rate = streams[0].get("sample_rate")
        return (
            round(float(duration), 3) if duration else None,
            int(sample_rate) if sample_rate else None,
        )
    except Exception:
        return None, None
