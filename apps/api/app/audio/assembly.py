"""FFmpeg-based final-audio assembly.

Joins generated chunk WAVs (with a configurable pause between them), applies
conservative loudness normalization, and encodes MP3 + WAV. All FFmpeg calls use
argument arrays (never a shell string) so text can't inject commands.
"""

from __future__ import annotations

import os
import shutil
import subprocess
import tempfile
from dataclasses import dataclass

from app.audio.probe import probe_with_ffprobe
from app.errors import UpstreamError

# Podcast/YouTube-friendly target. Conservative so speech dynamics survive.
_LOUDNORM = "loudnorm=I=-16:TP=-1.5:LRA=11"
_WORK_RATE = 24_000  # chunks are 24 kHz mono
_OUT_RATE = 44_100


@dataclass
class AssemblyResult:
    mp3: bytes
    wav: bytes
    duration_seconds: float


def ffmpeg_available() -> bool:
    return shutil.which("ffmpeg") is not None and shutil.which("ffprobe") is not None


def _run(args: list[str]) -> None:
    try:
        subprocess.run(args, capture_output=True, check=True, timeout=600)
    except subprocess.CalledProcessError as exc:
        detail = (exc.stderr or b"").decode("utf-8", "ignore")[-400:]
        raise UpstreamError(f"FFmpeg failed: {detail}", code="ffmpeg_error") from exc
    except FileNotFoundError as exc:
        raise UpstreamError("FFmpeg is not installed on the server.", code="ffmpeg_missing") from exc


def assemble(chunks: list[bytes], *, gap_seconds: float = 0.24, normalize: bool = True) -> AssemblyResult:
    """Concatenate chunk WAV bytes into normalized MP3 + WAV."""
    if not ffmpeg_available():
        raise UpstreamError("FFmpeg is not installed on the server.", code="ffmpeg_missing")
    if not chunks:
        raise UpstreamError("No generated audio to assemble.", code="nothing_to_assemble")

    with tempfile.TemporaryDirectory() as work:
        chunk_paths: list[str] = []
        for i, data in enumerate(chunks):
            p = os.path.join(work, f"c{i}.wav")
            with open(p, "wb") as fh:
                fh.write(data)
            chunk_paths.append(p)

        # Silence spacer between chunks.
        silence = os.path.join(work, "silence.wav")
        if gap_seconds > 0:
            _run(
                [
                    "ffmpeg", "-y", "-f", "lavfi",
                    "-i", f"anullsrc=r={_WORK_RATE}:cl=mono",
                    "-t", f"{gap_seconds}", "-ar", str(_WORK_RATE), "-ac", "1",
                    "-c:a", "pcm_s16le", silence,
                ]
            )

        # Concat list interleaving chunks with the spacer.
        list_path = os.path.join(work, "list.txt")
        with open(list_path, "w", encoding="utf-8") as fh:
            for i, p in enumerate(chunk_paths):
                if i > 0 and gap_seconds > 0:
                    fh.write(f"file '{silence}'\n")
                fh.write(f"file '{p}'\n")

        joined = os.path.join(work, "joined.wav")
        _run(
            [
                "ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", list_path,
                "-ar", str(_WORK_RATE), "-ac", "1", "-c:a", "pcm_s16le", joined,
            ]
        )

        af = ["-af", _LOUDNORM] if normalize else []

        out_wav = os.path.join(work, "final.wav")
        _run(["ffmpeg", "-y", "-i", joined, *af, "-ar", str(_OUT_RATE), out_wav])

        out_mp3 = os.path.join(work, "final.mp3")
        _run(["ffmpeg", "-y", "-i", joined, *af, "-ar", str(_OUT_RATE), "-b:a", "192k", out_mp3])

        duration, _ = probe_with_ffprobe(out_wav)

        with open(out_wav, "rb") as fh:
            wav_bytes = fh.read()
        with open(out_mp3, "rb") as fh:
            mp3_bytes = fh.read()

    return AssemblyResult(mp3=mp3_bytes, wav=wav_bytes, duration_seconds=duration or 0.0)
