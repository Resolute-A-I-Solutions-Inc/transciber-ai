"""REST API: languages, transcription, job polling, media serving, admin."""
from __future__ import annotations

import uuid
from pathlib import Path
from typing import Optional

from fastapi import (APIRouter, Depends, File, Form, Header, HTTPException,
                     UploadFile)
from fastapi.responses import FileResponse

from . import config, db, jobs
from .config import MAX_UPLOAD_BYTES, UPLOAD_CHUNK_BYTES, UPLOAD_DIR
from .languages import language_options

router = APIRouter(prefix="/api")


@router.get("/languages")
def get_languages() -> list[dict[str, str]]:
    return language_options()


@router.post("/transcribe")
async def create_transcription(
    file: Optional[UploadFile] = File(None),
    url: Optional[str] = Form(None),
    language: str = Form("auto"),
    engine: str = Form("whisper"),
) -> dict[str, str]:
    url = (url or "").strip()
    if file is None and not url:
        raise HTTPException(status_code=400, detail="Provide an audio/video file or a URL.")

    # A file upload takes precedence if somehow both are sent.
    if file is not None and file.filename:
        safe_name = Path(file.filename).name
        dest = UPLOAD_DIR / f"{uuid.uuid4().hex}_{safe_name}"
        size = 0
        try:
            with open(dest, "wb") as out:
                while True:
                    chunk = await file.read(UPLOAD_CHUNK_BYTES)
                    if not chunk:
                        break
                    size += len(chunk)
                    if size > MAX_UPLOAD_BYTES:
                        raise HTTPException(
                            status_code=413,
                            detail=f"File exceeds the {MAX_UPLOAD_BYTES // (1024**3)}GB limit.",
                        )
                    out.write(chunk)
        except HTTPException:
            dest.unlink(missing_ok=True)
            raise
        source = {"type": "file", "path": str(dest), "name": safe_name,
                  "content_type": file.content_type or ""}
    else:
        source = {"type": "url", "url": url, "name": url}

    job_id = jobs.submit(source, engine.lower(), language)
    return {"job_id": job_id}


@router.get("/jobs/{job_id}")
def get_job_status(job_id: str) -> dict:
    job = jobs.get_job(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found.")
    return job


@router.get("/transcriptions")
def list_transcriptions() -> list[dict]:
    """Recent saved transcriptions (empty list if no database configured)."""
    return db.list_recent()


@router.get("/transcriptions/{job_id}")
def get_transcription(job_id: str) -> dict:
    row = db.get_one(job_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Transcription not found.")
    return row


# --- Media serving (for the Review-panel player; supports range/seek) --------
def _resolve_media(job_id: str) -> tuple[Path, str]:
    job = jobs.get_job(job_id)
    basename = (job or {}).get("media_path") or ""
    content_type = (job or {}).get("content_type") or "application/octet-stream"
    if not basename:
        raise HTTPException(status_code=404, detail="No media for this submission.")
    # Guard against path traversal — must be a plain filename inside UPLOAD_DIR.
    if Path(basename).name != basename:
        raise HTTPException(status_code=400, detail="Invalid media path.")
    path = UPLOAD_DIR / basename
    if not path.is_file():
        raise HTTPException(status_code=404, detail="Media file not found (may have been deleted).")
    return path, content_type


@router.get("/media/{job_id}")
def get_media(job_id: str) -> FileResponse:
    path, content_type = _resolve_media(job_id)
    # Starlette's FileResponse honours the Range header, so the player can seek.
    return FileResponse(path, media_type=content_type, filename=path.name)


# --- Admin (gated by ADMIN_KEY; fail-closed when unset) ----------------------
def require_admin(x_admin_key: Optional[str] = Header(None)) -> None:
    if not config.ADMIN_KEY:
        raise HTTPException(status_code=503, detail="Admin dashboard is disabled (ADMIN_KEY not set).")
    if x_admin_key != config.ADMIN_KEY:
        raise HTTPException(status_code=401, detail="Invalid or missing admin key.")


admin = APIRouter(prefix="/api/admin", dependencies=[Depends(require_admin)])


@admin.get("/check")
def admin_check() -> dict:
    return {"ok": True}


@admin.get("/stats")
def admin_stats() -> dict:
    return db.stats()


@admin.get("/submissions")
def admin_list() -> list[dict]:
    return db.list_all()


@admin.delete("/submissions/{job_id}")
def admin_delete(job_id: str) -> dict:
    media_basename = db.delete(job_id)
    if media_basename is None:
        raise HTTPException(status_code=404, detail="Submission not found.")
    if media_basename and Path(media_basename).name == media_basename:
        (UPLOAD_DIR / media_basename).unlink(missing_ok=True)
    return {"deleted": True}


@admin.post("/submissions/{job_id}/retry")
def admin_retry(job_id: str) -> dict:
    if not jobs.retry(job_id):
        raise HTTPException(status_code=404, detail="Nothing to retry (no stored media or URL).")
    return {"requeued": True}
