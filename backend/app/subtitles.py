"""Pure functions that turn transcription segments into text/subtitle formats.

A *segment* is a mapping with ``start`` (seconds, float), ``end`` (seconds,
float) and ``text`` (str). These functions have no I/O so they are unit-tested
directly and reused as the single source of truth for downloads.
"""
from __future__ import annotations

from typing import Iterable, Mapping

Segment = Mapping[str, object]


def format_timestamp(seconds: float, sep: str = ",") -> str:
    """Format seconds as ``HH:MM:SS<sep>mmm`` (SRT uses ``,``; VTT uses ``.``)."""
    if seconds is None or seconds < 0:
        seconds = 0.0
    ms_total = int(round(float(seconds) * 1000))
    hours, ms_total = divmod(ms_total, 3_600_000)
    minutes, ms_total = divmod(ms_total, 60_000)
    secs, ms = divmod(ms_total, 1000)
    return f"{hours:02d}:{minutes:02d}:{secs:02d}{sep}{ms:03d}"


def _text(seg: Segment) -> str:
    return str(seg.get("text", "")).strip()


def to_txt(segments: Iterable[Segment]) -> str:
    """Plain transcript: one segment per line, trailing/leading whitespace trimmed."""
    lines = [_text(s) for s in segments]
    return "\n".join(line for line in lines if line)


def to_srt(segments: Iterable[Segment]) -> str:
    """SubRip (.srt): numbered cues with ``,`` millisecond separator."""
    blocks = []
    for index, seg in enumerate(segments, start=1):
        start = format_timestamp(float(seg["start"]), ",")
        end = format_timestamp(float(seg["end"]), ",")
        blocks.append(f"{index}\n{start} --> {end}\n{_text(seg)}")
    return ("\n\n".join(blocks) + "\n") if blocks else ""


def to_vtt(segments: Iterable[Segment]) -> str:
    """WebVTT (.vtt): ``WEBVTT`` header, cues with ``.`` millisecond separator."""
    parts = ["WEBVTT", ""]
    for seg in segments:
        start = format_timestamp(float(seg["start"]), ".")
        end = format_timestamp(float(seg["end"]), ".")
        parts.append(f"{start} --> {end}")
        parts.append(_text(seg))
        parts.append("")
    return "\n".join(parts).rstrip() + "\n"
