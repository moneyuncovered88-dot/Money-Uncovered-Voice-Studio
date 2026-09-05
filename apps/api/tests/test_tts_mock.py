import io
import wave

from app.services.tts.base import VoiceReference, validate_against_controls
from app.services.tts.mock import MockTTSProvider


def test_mock_generates_valid_wav():
    provider = MockTTSProvider()
    voice = provider.load_voice(VoiceReference(voice_id="v1"))
    result = provider.generate("Hello world, this is a test.", voice, {"seed": 1})

    assert result.audio_format == "wav"
    assert result.sample_rate == 24_000
    assert result.duration_seconds > 0

    # The bytes must be a parseable WAV file.
    with wave.open(io.BytesIO(result.audio), "rb") as wav:
        assert wav.getnchannels() == 1
        assert wav.getframerate() == 24_000
        assert wav.getnframes() > 0


def test_validate_against_controls_clamps_and_filters():
    controls = MockTTSProvider().get_supported_controls()
    out = validate_against_controls(
        {"temperature": 99, "unknown": "x"}, controls
    )
    assert out["temperature"] == 1.5  # clamped to max
    assert "unknown" not in out       # unknown keys dropped
    assert "seed" in out              # missing key filled from default
