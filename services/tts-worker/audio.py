"""Waveform → WAV bytes helpers for the worker."""

from __future__ import annotations

import io
from typing import Any

import torchaudio


def tensor_to_wav_bytes(wav: Any, sample_rate: int) -> bytes:
    """Encode a torch waveform tensor as 16-bit WAV bytes."""
    tensor = wav.detach().to("cpu")
    if tensor.dim() == 1:
        tensor = tensor.unsqueeze(0)  # (samples,) -> (1, samples)
    buffer = io.BytesIO()
    torchaudio.save(buffer, tensor, sample_rate, format="wav")
    return buffer.getvalue()


def duration_seconds(wav: Any, sample_rate: int) -> float:
    n = int(wav.shape[-1])
    if sample_rate <= 0:
        return 0.0
    return round(n / float(sample_rate), 3)
