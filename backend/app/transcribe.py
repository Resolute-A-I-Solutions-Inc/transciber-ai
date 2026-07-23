"""Transcription engines. Both return the unified schema::

    {"segments": [{"start", "end", "text"}], "full_text": str, "language_detected": str}
"""
from __future__ import annotations

import functools
import json
from pathlib import Path
from typing import Callable, Optional

from . import config
from .config import (
    GEMINI_API_KEY, GEMINI_MODEL, WHISPER_BEAM_SIZE, WHISPER_COMPUTE,
    WHISPER_CPU_THREADS, WHISPER_DEVICE, WHISPER_IMPL, WHISPER_MODEL, WHISPER_VAD,
)
from .languages import LANGUAGES, normalize_language

ProgressCb = Optional[Callable[[float], None]]


@functools.lru_cache(maxsize=4)
def _load_whisper(name: str):
    import whisper
    return whisper.load_model(name)


def _resolve_device_compute() -> tuple[str, str]:
    """Pick device + compute type: CUDA/float16 when available, else CPU/int8."""
    device = WHISPER_DEVICE
    if device == "auto":
        try:
            import torch
            device = "cuda" if torch.cuda.is_available() else "cpu"
        except Exception:  # noqa: BLE001
            device = "cpu"
    compute = WHISPER_COMPUTE or ("float16" if device == "cuda" else "int8")
    return device, compute


@functools.lru_cache(maxsize=4)
def _load_faster(name: str, device: str, compute: str, threads: int):
    from faster_whisper import WhisperModel
    return WhisperModel(name, device=device, compute_type=compute, cpu_threads=threads)


def faster_whisper_transcribe(media_path: str | Path, language: Optional[str] = None,
                              progress_cb: ProgressCb = None,
                              duration: Optional[float] = None) -> dict:
    """Transcribe with faster-whisper (CTranslate2): int8/CPU or fp16/CUDA, VAD, streaming.

    Segments stream as they decode, so we can report real progress (end / duration).
    """
    device, compute = _resolve_device_compute()
    model = _load_faster(WHISPER_MODEL, device, compute, WHISPER_CPU_THREADS)
    lang = normalize_language(language)  # None => auto-detect

    seg_iter, info = model.transcribe(
        str(media_path), language=lang, beam_size=WHISPER_BEAM_SIZE, vad_filter=WHISPER_VAD,
    )
    total = duration or getattr(info, "duration", 0.0) or 0.0

    segments = []
    for s in seg_iter:  # generator — decoding happens as we iterate
        segments.append({"start": float(s.start), "end": float(s.end), "text": s.text.strip()})
        if progress_cb and total:
            progress_cb(min(0.99, s.end / total))

    full_text = " ".join(x["text"] for x in segments).strip()
    return _pack(segments, full_text, getattr(info, "language", "") or "")


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


def transcribe(engine: str, media_path: str | Path, language: Optional[str] = None,
               progress_cb: ProgressCb = None, duration: Optional[float] = None) -> dict:
    """Dispatch to the requested engine.

    ``gemini`` -> cloud. ``whisper`` -> faster-whisper (default) or openai-whisper,
    controlled by ``WHISPER_IMPL``. Only faster-whisper reports streaming progress.
    """
    if engine == "gemini":
        return gemini_transcribe(media_path, language)
    if config.WHISPER_IMPL == "openai":
        return whisper_transcribe(media_path, language)
    return faster_whisper_transcribe(media_path, language, progress_cb, duration)
