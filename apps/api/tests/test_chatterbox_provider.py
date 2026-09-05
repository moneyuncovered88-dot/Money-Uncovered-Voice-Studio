"""ChatterboxProvider payload-building and response-parsing (no network).

A fake runner stands in for the RunPod call so we can assert the request shape
and the parsed GenerationResult.
"""

import base64
import io
import wave

from app.services.tts.base import VoiceReference
from app.services.tts.chatterbox import ChatterboxProvider


def _fake_wav_b64(seconds: float = 0.1, rate: int = 24_000) -> str:
    buf = io.BytesIO()
    with wave.open(buf, "wb") as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(rate)
        wav.writeframes(b"\x00\x00" * int(rate * seconds))
    return base64.b64encode(buf.getvalue()).decode("ascii")


def test_generate_builds_payload_and_parses_result():
    captured: dict = {}

    def runner(payload):
        captured["payload"] = payload
        return {
            "status": "completed",
            "audio_b64": _fake_wav_b64(),
            "sample_rate": 24_000,
            "duration_seconds": 0.1,
            "generation_ms": 42,
            "model_name": "chatterbox-turbo",
        }

    provider = ChatterboxProvider(runner=runner)
    voice = provider.load_voice(VoiceReference(voice_id="v1", audio=b"REFAUDIO", language="en"))

    # exaggeration above the max should be clamped by validate_settings.
    result = provider.generate("Hello world", voice, {"exaggeration": 9, "cfg_weight": 0.4})

    assert result.audio_format == "wav"
    assert result.sample_rate == 24_000
    assert result.generation_ms == 42
    assert len(result.audio) > 44  # real WAV (header + frames)

    payload = captured["payload"]
    assert payload["text"] == "Hello world"
    assert payload["voice_id"] == "v1"
    assert payload["voice_reference_b64"] == base64.b64encode(b"REFAUDIO").decode("ascii")
    assert payload["settings"]["exaggeration"] == 2.0  # clamped
    assert payload["settings"]["cfg_weight"] == 0.4


def test_generate_raises_on_worker_failure():
    def runner(_payload):
        return {"status": "failed", "error": "boom"}

    provider = ChatterboxProvider(runner=runner)
    voice = provider.load_voice(VoiceReference(voice_id="v1", audio=b"x"))
    try:
        provider.generate("hi", voice, {})
    except Exception as exc:  # UpstreamError
        assert "boom" in str(exc)
        return
    raise AssertionError("expected failure to raise")
