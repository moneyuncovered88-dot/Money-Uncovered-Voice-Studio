from app.preprocessing.pipeline import preprocess
from app.preprocessing.pronunciation import PronunciationEntry

FINANCE_SCRIPT = """INTRO

In 2008, the S&P 500 lost about $8 trillion in value. The APR on the average credit
card climbed above 20%.

SECTION 1

By 1990s standards, a FICO score of 720 was excellent. Today, mortgage-backed
securities still shape the market — and the Federal Reserve is watching closely.
[PAUSE] Rates moved 0.75% in a single meeting.
"""


def test_pipeline_produces_processed_text_and_chunks():
    entries = [
        PronunciationEntry(term="S&P 500", spoken_form="S and P five hundred"),
        PronunciationEntry(term="FICO", spoken_form="fy-co"),
        PronunciationEntry(term="APR", spoken_form="A P R"),
    ]
    result = preprocess(
        FINANCE_SCRIPT,
        entries=entries,
        max_chunk_chars=200,
        speak_headings=False,
        words_per_minute=150,
    )

    # Headings dropped, stage directions removed, pronunciations applied.
    assert "INTRO" not in result.processed_text
    assert "SECTION 1" not in result.processed_text
    assert "[PAUSE]" not in result.processed_text
    assert "S and P five hundred" in result.processed_text
    assert "fy-co" in result.processed_text

    # Chunking respects the max and produces multiple chunks.
    assert result.chunk_count >= 2
    assert all(len(c) <= 200 for c in result.chunks)

    # Stats are populated.
    assert result.word_count > 0
    assert result.character_count > 0
    assert result.estimated_duration_seconds > 0

    # Money and percentages are preserved (not mangled by sentence splitting).
    joined = " ".join(result.chunks)
    assert "$8 trillion" in joined
    assert "20%" in joined
    assert "0.75%" in joined


def test_pipeline_can_keep_headings_when_enabled():
    result = preprocess("INTRO\n\nHello world.", entries=[], speak_headings=True)
    assert "INTRO" in result.processed_text
