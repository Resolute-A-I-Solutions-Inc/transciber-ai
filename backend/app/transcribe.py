"""Transcription engines. Both return the unified schema::

    {"segments": [{"start", "end", "text"}], "full_text": str, "language_detected": str}
"""
from __future__ import annotations

import functools
import json
from pathlib import Path
from typing import Optional

from .config import GEMINI_API_KEY, GEMINI_MODEL, WHISPER_MODEL
from .languages import LANGUAGES, normalize_language


@functools.lru_cache(maxsize=4)
def _load_whisper(name: str):
    import whisper
    return whisper.load_model(name)


def _pack(segments: list[dict], full_text: str, language: str) -> dict:
    return {
        "segments": segments,
        "full_text": full_text.strip(),
        "language_detected": language or "",
    }


def whisper_transcribe(media_path: str | Path, language: Optional[str] = None) -> dict:
    """Transcribe with the local OpenAI Whisper model (segment-level timestamps)."""
    model = _load_whisper(WHISPER_MODEL)
    lang = normalize_language(language)  # None => auto-detect
    result = model.transcribe(str(media_path), language=lang, fp16=False, verbose=False)
    segments = [
        {"start": float(s["start"]), "end": float(s["end"]), "text": str(s["text"]).strip()}
        for s in result.get("segments", [])
    ]
    return _pack(segments, result.get("text", ""), result.get("language", ""))


def gemini_transcribe(media_path: str | Path, language: Optional[str] = None) -> dict:
    """Transcribe with Google Gemini, requesting JSON segments with timestamps."""
    if not GEMINI_API_KEY:
        raise RuntimeError("GEMINI_API_KEY is not set; cannot use the Gemini engine.")

    from google import genai
    from google.genai import types

    client = genai.Client(api_key=GEMINI_API_KEY)
    uploaded = client.files.upload(file=str(media_path))

    lang = normalize_language(language)
    hint = f" The audio is in {LANGUAGES.get(lang, lang)}." if lang else ""
    prompt = (
        "Transcribe the spoken audio verbatim." + hint +
        " Return JSON with a `language` (ISO code) and a `segments` array; each "
        "segment has `start` and `end` in seconds and the spoken `text`."
    )

    schema = types.Schema(
        type=types.Type.OBJECT,
        required=["language", "segments"],
        properties={
            "language": types.Schema(type=types.Type.STRING),
            "segments": types.Schema(
                type=types.Type.ARRAY,
                items=types.Schema(
                    type=types.Type.OBJECT,
                    required=["start", "end", "text"],
                    properties={
                        "start": types.Schema(type=types.Type.NUMBER),
                        "end": types.Schema(type=types.Type.NUMBER),
                        "text": types.Schema(type=types.Type.STRING),
                    },
                ),
            ),
        },
    )

    resp = client.models.generate_content(
        model=GEMINI_MODEL,
        contents=[uploaded, prompt],
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=schema,
        ),
    )

    data = json.loads(resp.text)
    segments = [
        {"start": float(s.get("start", 0)), "end": float(s.get("end", 0)),
         "text": str(s.get("text", "")).strip()}
        for s in data.get("segments", [])
        if str(s.get("text", "")).strip()
    ]
    full_text = "\n".join(s["text"] for s in segments)
    return _pack(segments, full_text, data.get("language", ""))


def transcribe(engine: str, media_path: str | Path, language: Optional[str] = None) -> dict:
    """Dispatch to the requested engine (``whisper`` or ``gemini``)."""
    if engine == "gemini":
        return gemini_transcribe(media_path, language)
    return whisper_transcribe(media_path, language)
