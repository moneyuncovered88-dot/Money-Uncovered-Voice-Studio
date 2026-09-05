from app.utils.slug import safe_filename, slugify


def test_slugify_basic():
    assert slugify("How Credit Cards Quietly Took Over America") == (
        "how-credit-cards-quietly-took-over-america"
    )


def test_slugify_strips_symbols_and_accents():
    assert slugify("S&P 500 — Café!") == "s-p-500-cafe"


def test_slugify_empty_is_untitled():
    assert slugify("!!!") == "untitled"


def test_safe_filename_with_extension():
    name = safe_filename("Day 1: Credit Cards!", extension="mp3")
    assert name.endswith(".mp3")
    assert "/" not in name and "\\" not in name and ":" not in name


def test_safe_filename_no_path_traversal():
    name = safe_filename("../../etc/passwd")
    assert ".." not in name
    assert "/" not in name
