"""Media acquisition and normalization.

- ``download_url``  : fetch a public URL (YouTube or direct media) via yt-dlp.
- ``to_wav16k``     : normalize any audio/video to 16 kHz mono WAV via ffmpeg
                      (the format Whisper expects).
- ``probe_duration``: read media duration via ffprobe (for progress estimates).
"""
from __future__ import annotations

import shutil
import subprocess
import uuid
from pathlib import Path
from typing import Callable, Optional

from .config import MAX_UPLOAD_BYTES, UPLOAD_DIR

FFMPEG = shutil.which("ffmpeg") or "ffmpeg"
FFPROBE = shutil.which("ffprobe") or "ffprobe"

ProgressCb = Optional[Callable[[float], None]]


def probe_duration(path: str | Path) -> float:
    """Return media duration in seconds (0.0 if it can't be determined)."""
    proc = subprocess.run(
        [FFPROBE, "-v", "error", "-show_entries", "format=duration",
         "-of", "default=noprint_wrappers=1:nokey=1", str(path)],
        capture_output=True, text=True,
    )
    try:
        return float(proc.stdout.strip())
    except (TypeError, ValueError):
        return 0.0


def to_wav16k(src: str | Path, dst: str | Path | None = None) -> Path:
    """Convert ``src`` to 16 kHz mono WAV. Raises RuntimeError on ffmpeg failure."""
    src = Path(src)
    dst = Path(dst) if dst else src.with_suffix(".16k.wav")
    proc = subprocess.run(
        [FFMPEG, "-y", "-i", str(src), "-vn", "-ac", "1", "-ar", "16000",
         "-f", "wav", str(dst)],
        capture_output=True, text=True,
    )
    if proc.returncode != 0 or not dst.exists():
        tail = (proc.stderr or "").strip()[-800:]
        raise RuntimeError(f"ffmpeg conversion failed: {tail}")
    return dst


def download_url(url: str, dest_dir: str | Path = UPLOAD_DIR,
                 progress_cb: ProgressCb = None) -> Path:
    """Download a public media URL and return the local file path.

    Uses yt-dlp's generic extractor, so it handles YouTube *and* direct links.
    Enforces MAX_UPLOAD_BYTES via ``max_filesize``.
    """
    import yt_dlp

    dest_dir = Path(dest_dir)
    dest_dir.mkdir(parents=True, exist_ok=True)
    out_tmpl = str(dest_dir / f"{uuid.uuid4().hex}.%(ext)s")

    def _hook(d: dict) -> None:
        if progress_cb and d.get("status") == "downloading":
            total = d.get("total_bytes") or d.get("total_bytes_estimate")
            done = d.get("downloaded_bytes")
            if total and done:
                progress_cb(min(0.99, done / total))

    ydl_opts = {
        "outtmpl": out_tmpl,
        "noplaylist": True,
        "quiet": True,
        "no_warnings": True,
        "max_filesize": MAX_UPLOAD_BYTES,
        "format": "bestaudio/best",
        "progress_hooks": [_hook],
    }

    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download=True)
        if info is None:
            raise RuntimeError("Could not fetch media from URL (too large or unsupported).")
        requested = info.get("requested_downloads")
        if requested:
            path = Path(requested[0]["filepath"])
        else:
            path = Path(ydl.prepare_filename(info))

    if not path.exists():
        raise RuntimeError("Download did not produce a file (URL may exceed size limit).")
    return path
