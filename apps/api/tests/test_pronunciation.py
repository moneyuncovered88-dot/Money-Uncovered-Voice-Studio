from app.preprocessing.pronunciation import PronunciationEntry, apply_pronunciations


def test_whole_word_match_does_not_corrupt_unrelated_words():
    entries = [PronunciationEntry(term="IRA", spoken_form="I-R-A")]
    # "IRA" should be replaced, but not the "IRA" inside "IRELAND".
    out = apply_pronunciations("Open an IRA in IRELAND", entries)
    assert out == "Open an I-R-A in IRELAND"


def test_longer_phrases_take_precedence():
    entries = [
        PronunciationEntry(term="S&P", spoken_form="S and P"),
        PronunciationEntry(term="S&P 500", spoken_form="S and P five hundred"),
    ]
    out = apply_pronunciations("The S&P 500 rose today", entries)
    assert out == "The S and P five hundred rose today"


def test_case_insensitive_default():
    entries = [PronunciationEntry(term="fico", spoken_form="fy-co")]
    out = apply_pronunciations("Your FICO score", entries)
    assert out == "Your fy-co score"


def test_case_sensitive_respected():
    entries = [PronunciationEntry(term="APR", spoken_form="A-P-R", case_sensitive=True)]
    out = apply_pronunciations("apr and APR", entries)
    assert out == "apr and A-P-R"


def test_disabled_entries_ignored():
    entries = [PronunciationEntry(term="APR", spoken_form="A-P-R", enabled=False)]
    assert apply_pronunciations("The APR is high", entries) == "The APR is high"


def test_symbol_terms_like_401k():
    entries = [PronunciationEntry(term="401(k)", spoken_form="four oh one k")]
    out = apply_pronunciations("A 401(k) plan", entries)
    assert out == "A four oh one k plan"
