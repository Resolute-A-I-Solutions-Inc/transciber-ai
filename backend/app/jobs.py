"""In-memory async job store + worker.

A transcription job runs on a background thread pool so the HTTP request returns
immediately with a ``job_id``. The frontend polls ``get_job`` for progress. This
is what lets a multi-GB / multi-minute transcription run without an HTTP timeout.
"""
from __future__ import annotations

import threading
import uuid
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import Optional

from .media import download_url, to_wav16k
from .subtitles import to_srt, to_vtt
from .transcribe import transcribe as run_transcribe

_executor = ThreadPoolExecutor(max_workers=2, thread_name_prefix="transcribe")
_jobs: dict[str, dict] = {}
_lock = threading.Lock()


def _set(job_id: str, **fields) -> None:
    with _lock:
        if job_id in _jobs:
            _jobs[job_id].update(fields)


def get_job(job_id: str) -> Optional[dict]:
    with _lock:
        job = _jobs.get(job_id)
        return dict(job) if job else None


def submit(source: dict, engine: str, language: str) -> str:
    """Create a job and dispatch it. ``source`` is {"type":"file"|"url", ...}."""
    job_id = uuid.uuid4().hex
    with _lock:
        _jobs[job_id] = {
            "id": job_id, "status": "queued", "phase": "Queued",
            "progress": 0.0, "result": None, "error": None,
        }
    _executor.submit(_run, job_id, source, engine, language)
    return job_id


def _cleanup(*paths: Optional[Path]) -> None:
    for p in paths:
        try:
            if p and Path(p).exists():
                Path(p).unlink()
        except OSError:
            pass


def _run(job_id: str, source: dict, engine: str, language: str) -> None:
    media: Optional[Path] = None
    wav: Optional[Path] = None
    downloaded = False
    try:
        if source["type"] == "url":
            _set(job_id, status="downloading", phase="Downloading media", progress=0.0)
            media = download_url(
                source["url"],
                progress_cb=lambda f: _set(job_id, progress=round(f, 3)),
            )
            downloaded = True
        else:
            media = Path(source["path"])

        _set(job_id, status="converting", phase="Converting audio", progress=None)
        wav = to_wav16k(media)

        _set(job_id, status="transcribing", phase="Transcribing", progress=None)
        result = run_transcribe(engine, wav, language)
        result["srt"] = to_srt(result["segments"])
        result["vtt"] = to_vtt(result["segments"])

        _set(job_id, status="done", phase="Done", progress=1.0, result=result)
    except Exception as exc:  # noqa: BLE001 - surface any failure to the UI
        _set(job_id, status="error", phase="Error", progress=None, error=str(exc))
    finally:
        # Remove the working WAV always; remove source media if we downloaded it
        # or it was an uploaded temp file.
        _cleanup(wav)
        if downloaded or (media and source.get("type") == "file"):
            _cleanup(media)
