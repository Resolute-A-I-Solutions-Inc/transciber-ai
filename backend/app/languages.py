"""Whisper language helpers.

The dropdown must send Whisper *language codes* (e.g. ``en``), never display
names. ``LANGUAGES`` maps code -> English name and is the authoritative list.
"""
from __future__ import annotations

from typing import Optional

from whisper.tokenizer import LANGUAGES

AUTO = "auto"


def language_options() -> list[dict[str, str]]:
    """Return ``[{code, name}]`` with Auto-detect first, then names A→Z."""
    options = [{"code": AUTO, "name": "Auto-detect"}]
    for code, name in sorted(LANGUAGES.items(), key=lambda kv: kv[1]):
        options.append({"code": code, "name": name.title()})
    return options


def is_valid_code(code: Optional[str]) -> bool:
    return code == AUTO or code in LANGUAGES


def normalize_language(code: Optional[str]) -> Optional[str]:
    """Map a UI value to what Whisper wants: ``None`` for auto-detect, else the code.

    Unknown/empty values fall back to ``None`` (auto-detect) rather than erroring.
    """
    if not code or code == AUTO:
        return None
    return code if code in LANGUAGES else None
