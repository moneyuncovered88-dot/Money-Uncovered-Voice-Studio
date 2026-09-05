from app.preprocessing import normalize


def test_normalize_whitespace_collapses_spaces_and_blank_lines():
    raw = "Hello    world\n\n\n\nNext   paragraph  "
    out = normalize.normalize_whitespace(raw)
    assert out == "Hello world\n\nNext paragraph"


def test_normalize_punctuation_maps_unicode():
    raw = "“Smart” quotes — and… more"
    out = normalize.normalize_punctuation(raw)
    assert out == '"Smart" quotes - and... more'


def test_strip_stage_directions():
    raw = "Welcome [PAUSE] to the show [LONG PAUSE] today."
    out = normalize.strip_stage_directions(raw)
    assert "[" not in out and "]" not in out
    assert "Welcome" in out and "today." in out


def test_is_heading_detects_section_headings():
    assert normalize.is_heading("SECTION 1")
    assert normalize.is_heading("INTRO")
    assert normalize.is_heading("CONCLUSION")


def test_is_heading_rejects_prose():
    assert not normalize.is_heading("The credit card took over America.")
    assert not normalize.is_heading("This is a normal sentence")


def test_remove_headings():
    raw = "INTRO\n\nThe story begins here.\n\nSECTION 1\n\nMore text."
    out = normalize.remove_headings(raw)
    assert "INTRO" not in out
    assert "SECTION 1" not in out
    assert "The story begins here." in out
