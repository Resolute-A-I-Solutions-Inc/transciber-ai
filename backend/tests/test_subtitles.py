from app.subtitles import format_timestamp, to_srt, to_txt, to_vtt

SEGMENTS = [
    {"start": 0.0, "end": 2.5, "text": " Hello world "},
    {"start": 2.5, "end": 3661.5, "text": "Second line."},
]


def test_format_timestamp_zero():
    assert format_timestamp(0) == "00:00:00,000"


def test_format_timestamp_hours_minutes_seconds_millis():
    # 1h 1m 1.5s
    assert format_timestamp(3661.5) == "01:01:01,500"


def test_format_timestamp_vtt_uses_dot():
    assert format_timestamp(1.25, ".") == "00:00:01.250"


def test_format_timestamp_negative_clamps_to_zero():
    assert format_timestamp(-5) == "00:00:00,000"


def test_to_txt_strips_and_joins_lines():
    assert to_txt(SEGMENTS) == "Hello world\nSecond line."


def test_to_txt_empty():
    assert to_txt([]) == ""


def test_to_srt_structure():
    out = to_srt(SEGMENTS)
    lines = out.splitlines()
    assert lines[0] == "1"
    assert lines[1] == "00:00:00,000 --> 00:00:02,500"
    assert lines[2] == "Hello world"
    assert lines[3] == ""
    assert lines[4] == "2"
    assert "-->" in lines[5]
    assert out.endswith("\n")


def test_to_srt_empty():
    assert to_srt([]) == ""


def test_to_vtt_header_and_dot_separator():
    out = to_vtt(SEGMENTS)
    assert out.startswith("WEBVTT")
    assert "00:00:00.000 --> 00:00:02.500" in out
    assert out.endswith("\n")
