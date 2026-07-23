"""Environment-driven configuration.

Loads an optional `.env` file (repo root or backend/) with a tiny parser so we
don't pull in an extra dependency. All settings have sensible defaults so the
app runs out of the box for local Whisper.
"""
from __future__ import annotations

import os
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent  # .../backend
REPO_DIR = BACKEND_DIR.parent


def _load_dotenv() -> None:
    """Populate os.environ from a .env file if present (does not override real env)."""
    for candidate in (REPO_DIR / ".env", BACKEND_DIR / ".env"):
        if not candidate.is_file():
            continue
        for raw in candidate.read_text(encoding="utf-8").splitlines():
            line = raw.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, value = line.partition("=")
            key = key.strip()
            value = value.strip().strip('"').strip("'")
            os.environ.setdefault(key, value)


_load_dotenv()


def _int_env(name: str, default: int) -> int:
    try:
        return int(os.environ.get(name, default))
    except (TypeError, ValueError):
        return default


# --- Transcription engine ---------------------------------------------------
WHISPER_MODEL = os.environ.get("WHISPER_MODEL", "small")  # tiny|base|small|medium|large
TRANSCRIBE_ENGINE = os.environ.get("TRANSCRIBE_ENGINE", "whisper").lower()  # whisper|gemini

# --- Gemini (optional secondary engine) -------------------------------------
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")

# --- Uploads ----------------------------------------------------------------
UPLOAD_DIR = Path(os.environ.get("UPLOAD_DIR", BACKEND_DIR / "uploads"))
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# 2 GiB default cap on uploaded / downloaded media.
MAX_UPLOAD_BYTES = _int_env("MAX_UPLOAD_BYTES", 2 * 1024 ** 3)

# Chunk size for streaming uploads to disk.
UPLOAD_CHUNK_BYTES = _int_env("UPLOAD_CHUNK_BYTES", 1024 * 1024)

# CORS origins for the Vite dev server.
DEV_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]
