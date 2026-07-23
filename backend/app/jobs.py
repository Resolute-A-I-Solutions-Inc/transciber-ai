"""In-memory async job store + worker.

A transcription job runs on a background thread pool so the HTTP request returns
immediately with a ``job_id``. The frontend polls ``get_job`` for progress. This
is what lets a multi-GB / multi-minute transcription run without an HTTP timeout.

Source media is retained on disk (under UPLOAD_DIR) so it can be played back in
the Review panel, served via /api/media, and managed from the admin dashboard.
Only the temporary 16 kHz WAV is deleted after transcription.
"""
from __future__ import annotations

import mimetypes
import queue
import threading
import uuid
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import Callable, Optional

from . import db
from .config import UPLOAD_DIR
from .media import download_url, probe_duration, to_wav16k
from .subtitles import to_srt, to_vtt
from .transcribe import transcribe as run_transcribe

_executor = ThreadPoolExecutor(max_workers=2, thread_name_prefix="transcribe")
_jobs: dict[str, dict] = {}
_lock = threading.Lock()
_persist_queue: queue.Queue[tuple[Callable[..., object], tuple[object, ...]]] = queue.Queue()


def _persistence_worker() -> None:
    """Run optional database writes in order without blocking jobs or requests."""
    while True:
        func, args = _persist_queue.get()
        try:
            func(*args)
        except Exception:  # noqa: BLE001 - persistence is best-effort
            pass
        finally:
            _persist_queue.task_done()


threading.Thread(
    target=_persistence_worker,
    name="transcriber-persistence",
    daemon=True,
).start()


def _persist(func: Callable[..., object], *args: object) -> None:
    if db.enabled():
        _persist_queue.put((func, args))


def _set(job_id: str, **fields) -> None:
    with _lock:
        if job_id in _jobs:
            _jobs[job_id].update(fields)


def _guess_content_type(path: Path, fallback: str = "") -> str:
    return fallback or mimetypes.guess_type(str(path))[0] or "application/octet-stream"


def get_job(job_id: str) -> Optional[dict]:
    with _lock:
        job = _jobs.get(job_id)
        if job:
            return dict(job)
    # Not in memory — fall back to persisted history (survives restarts).
    row = db.get_one(job_id)
    if row is None:
        return None
    base = {"id": job_id, "content_type": row.get("content_type") or "",
            "media_path": row.get("media_path") or ""}
    if row.get("status") == "done":
        result = {
            "segments": row.get("segments") or [],
            "full_text": row.get("full_text") or "",
            "language_detected": row.get("language_detected") or "",
            "srt": row.get("srt") or "",
            "vtt": row.get("vtt") or "",
        }
        return {**base, "status": "done", "phase": "Done", "progress": 1.0,
                "result": result, "error": None}
    return {**base, "status": row.get("status") or "error", "phase": "Error",
            "progress": None, "result": None, "error": row.get("error")}


def submit(source: dict, engine: str, language: str) -> str:
    """Create a job and dispatch it. ``source`` is {"type":"file"|"url", ...}."""
    job_id = uuid.uuid4().hex
    media_basename = Path(source["path"]).name if source["type"] == "file" else ""
    content_type = source.get("content_type", "")
    source_url = source.get("url", "") if source["type"] == "url" else ""
    with _lock:
        _jobs[job_id] = {
            "id": job_id, "status": "queued", "phase": "Queued", "progress": 0.0,
            "result": None, "error": None,
            "media_path": media_basename, "content_type": content_type,
        }
    _persist(db.insert_pending, job_id, source["type"], source.get("name", ""),
             source_url, engine, language, media_basename, content_type)
    _executor.submit(_run, job_id, source, engine, language)
    return job_id


def retry(job_id: str) -> bool:
    """Re-queue a submission (e.g. a failed one) using its stored media or URL."""
    info = db.get_retry_info(job_id)
    if not info:
        return False
    engine = info.get("engine") or "whisper"
    language = info.get("language") or "auto"
    if info.get("media_path"):
        source = {"type": "file", "path": str(UPLOAD_DIR / info["media_path"]),
                  "name": info.get("source_name") or "",
                  "content_type": info.get("content_type") or ""}
    elif info.get("source_url"):
        source = {"type": "url", "url": info["source_url"],
                  "name": info.get("source_name") or info["source_url"]}
    else:
        return False
    with _lock:
        _jobs[job_id] = {
            "id": job_id, "status": "queued", "phase": "Queued", "progress": 0.0,
            "result": None, "error": None,
            "media_path": info.get("media_path") or "",
            "content_type": info.get("content_type") or "",
        }
    _persist(db.insert_pending, job_id, source["type"], source.get("name", ""),
             info.get("source_url") or "", engine, language,
             info.get("media_path") or "", info.get("content_type") or "")
    _executor.submit(_run, job_id, source, engine, language)
    return True


def _cleanup(*paths: Optional[Path]) -> None:
    for p in paths:
        try:
            if p and Path(p).exists():
                Path(p).unlink()
        except OSError:
            pass


def _run(job_id: str, source: dict, engine: str, language: str) -> None:
    wav: Optional[Path] = None
    try:
        if source["type"] == "url":
            _set(job_id, status="downloading", phase="Downloading media", progress=0.0)
            media = download_url(
                source["url"],
                progress_cb=lambda f: _set(job_id, progress=round(f, 3)),
            )
        else:
            media = Path(source["path"])

        # Record retained media so it can be played back / served / managed.
        content_type = _guess_content_type(media, source.get("content_type", ""))
        _set(job_id, media_path=media.name, content_type=content_type)
        _persist(db.set_media, job_id, media.name, content_type)

        _set(job_id, status="converting", phase="Converting audio", progress=None)
        wav = to_wav16k(media)

        _set(job_id, status="transcribing", phase="Transcribing", progress=None)
        duration = probe_duration(wav)
        result = run_transcribe(
            engine, wav, language,
            progress_cb=lambda frac: _set(job_id, progress=round(frac, 3)),
            duration=duration,
        )
        result["srt"] = to_srt(result["segments"])
        result["vtt"] = to_vtt(result["segments"])

        _set(job_id, status="done", phase="Done", progress=1.0, result=result)
        _persist(db.mark_done, job_id, result, duration)
    except Exception as exc:  # noqa: BLE001 - surface any failure to the UI
        _set(job_id, status="error", phase="Error", progress=None, error=str(exc))
        _persist(db.mark_error, job_id, str(exc))
    finally:
        _cleanup(wav)  # keep the source media; only the temp WAV is removed
