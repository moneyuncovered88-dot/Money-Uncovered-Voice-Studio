from app.services.chunks_service import plan_reuse


def test_reuse_when_identical():
    assert plan_reuse(["a", "b", "c"], ["a", "b", "c"]) is True


def test_no_reuse_when_text_changes():
    assert plan_reuse(["a", "b"], ["a", "B"]) is False


def test_no_reuse_when_count_changes():
    assert plan_reuse(["a", "b"], ["a", "b", "c"]) is False


def test_empty_matches_empty():
    assert plan_reuse([], []) is True
