import pytest

from request import parse_input


def test_valid_minimal():
    req = parse_input({"text": "Hello there."})
    assert req.text == "Hello there."
    assert req.voice_reference_b64 is None
    assert req.voice_reference_ext == "wav"
    assert req.output_format == "wav"


def test_text_required():
    with pytest.raises(ValueError):
        parse_input({"text": "   "})
    with pytest.raises(ValueError):
        parse_input({})


def test_input_must_be_object():
    with pytest.raises(ValueError):
        parse_input("nope")


def test_ext_falls_back_to_wav():
    req = parse_input({"text": "hi", "voice_reference_ext": ".ogg"})
    assert req.voice_reference_ext == "wav"
    req2 = parse_input({"text": "hi", "voice_reference_ext": "MP3"})
    assert req2.voice_reference_ext == "mp3"


def test_settings_must_be_object():
    with pytest.raises(ValueError):
        parse_input({"text": "hi", "settings": [1, 2, 3]})


def test_carries_settings_and_reference():
    req = parse_input(
        {
            "text": "hi",
            "voice_reference_b64": "QUJD",
            "voice_reference_ext": "flac",
            "voice_id": "v1",
            "settings": {"exaggeration": 0.6, "seed": 7},
        }
    )
    assert req.voice_reference_b64 == "QUJD"
    assert req.voice_reference_ext == "flac"
    assert req.voice_id == "v1"
    assert req.settings["seed"] == 7
