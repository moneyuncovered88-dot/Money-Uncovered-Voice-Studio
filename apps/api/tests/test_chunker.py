from app.preprocessing.chunker import (
    split_clauses,
    split_into_chunks,
    split_sentences,
)


def test_sentence_split_basic():
    text = "This is one. This is two! Is this three?"
    assert split_sentences(text) == ["This is one.", "This is two!", "Is this three?"]


def test_sentence_split_protects_decimals_and_money():
    text = "The rate is 3.75% today. It rose by $1.2 billion."
    sentences = split_sentences(text)
    assert sentences == ["The rate is 3.75% today.", "It rose by $1.2 billion."]


def test_sentence_split_protects_abbreviations():
    text = "The U.S. economy grew. Dr. Smith agreed."
    sentences = split_sentences(text)
    assert sentences == ["The U.S. economy grew.", "Dr. Smith agreed."]


def test_split_clauses():
    assert split_clauses("First, second; third: done") == [
        "First,",
        "second;",
        "third:",
        "done",
    ]


def test_chunks_respect_max_chars():
    para = "Sentence one is here. " * 20  # ~440 chars
    text = para.strip()
    chunks = split_into_chunks(text, 120)
    assert chunks, "expected chunks"
    assert all(len(c) <= 120 for c in chunks)


def test_chunks_prefer_paragraph_boundaries():
    text = "First paragraph.\n\nSecond paragraph.\n\nThird paragraph."
    chunks = split_into_chunks(text, 1000)
    # All paragraphs fit in one chunk when the budget is large.
    assert chunks == ["First paragraph. Second paragraph. Third paragraph."]


def test_never_break_mid_word():
    text = "supercalifragilisticexpialidocious " * 5
    chunks = split_into_chunks(text.strip(), 40)
    # Each real word stays intact (no partial words) since words < 40 chars.
    for chunk in chunks:
        for word in chunk.split():
            assert "supercalifragilisticexpialidocious" == word or word == ""


def test_empty_returns_no_chunks():
    assert split_into_chunks("", 100) == []
