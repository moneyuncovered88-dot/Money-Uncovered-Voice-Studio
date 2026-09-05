from app.audio.timeline import build_timeline, total_duration


def test_build_timeline_no_gap():
    entries = build_timeline([10.0, 8.5, 6.0])
    assert entries[0].start_seconds == 0.0
    assert entries[0].end_seconds == 10.0
    assert entries[1].start_seconds == 10.0
    assert entries[1].end_seconds == 18.5
    assert entries[2].end_seconds == 24.5


def test_build_timeline_with_gap_and_lead_in():
    entries = build_timeline([5.0, 5.0], lead_in_seconds=1.0, gap_seconds=0.5)
    assert entries[0].start_seconds == 1.0
    assert entries[0].end_seconds == 6.0
    assert entries[1].start_seconds == 6.5
    assert entries[1].end_seconds == 11.5


def test_total_duration():
    entries = build_timeline([10.0, 8.5])
    assert total_duration(entries) == 18.5
    assert total_duration([]) == 0.0
