"""REST API: language list, transcription submission, job polling."""
from __future__ import annotations

import uuid
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from . import db, jobs
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
        source = {"type": "file", "path": str(dest), "name": safe_name}
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
