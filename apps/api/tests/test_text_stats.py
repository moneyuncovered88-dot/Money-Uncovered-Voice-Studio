from app.preprocessing.text_stats import (
    count_characters,
    count_words,
    estimate_duration_seconds,
)


def test_count_words_handles_contractions_and_hyphens():
    # "It's" and "well-known" each count as one token.
    assert count_words("It's a well-known market index.") == 5


def test_count_words_empty():
    assert count_words("") == 0


def test_count_characters():
    assert count_characters("hello") == 5


def test_estimate_duration_seconds():
    # 150 words at 150 wpm = 60 seconds.
    assert estimate_duration_seconds(150, 150) == 60.0


def test_estimate_duration_rejects_bad_wpm():
    try:
        estimate_duration_seconds(100, 0)
    except ValueError:
        return
    raise AssertionError("expected ValueError")
