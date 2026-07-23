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
WHISPER_MODEL = os.environ.get("WHISPER_MODEL", "small")  # tiny|base|small|medium|large-v3
TRANSCRIBE_ENGINE = os.environ.get("TRANSCRIBE_ENGINE", "whisper").lower()  # whisper|gemini

# Local Whisper implementation:
#   faster = faster-whisper / CTranslate2 (~4x faster on CPU, int8, VAD)  [default]
#   openai = original openai-whisper (slower fp32 on CPU)
WHISPER_IMPL = os.environ.get("WHISPER_IMPL", "faster").lower()
# Device: auto (use CUDA if available, else CPU), or force cpu/cuda.
WHISPER_DEVICE = os.environ.get("WHISPER_DEVICE", "auto").lower()
# Compute type (empty => int8 on CPU, float16 on CUDA). e.g. int8, int8_float16, float16, float32
WHISPER_COMPUTE = os.environ.get("WHISPER_COMPUTE", "")
# CPU threads for CTranslate2 (0 => all physical cores).
WHISPER_CPU_THREADS = _int_env("WHISPER_CPU_THREADS", 0)
# Decoding beam size (1 = greedy, fastest; 5 = default accuracy).
WHISPER_BEAM_SIZE = int(os.environ.get("WHISPER_BEAM_SIZE", "5"))
# Skip silence with voice-activity detection (big win on long, gappy audio).
WHISPER_VAD = os.environ.get("WHISPER_VAD", "true").lower() not in ("0", "false", "no")

# --- Gemini (optional secondary engine) -------------------------------------
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")

# --- Admin dashboard --------------------------------------------------------
# Credential required to access the /admin dashboard and admin API.
# When EMPTY, the admin API is DISABLED (fail-closed) — nothing is exposed.
ADMIN_KEY = os.environ.get("ADMIN_KEY", "")

# --- Persistence (optional PostgreSQL) --------------------------------------
# When set, transcription results are saved to PostgreSQL and exposed as history.
# Example: postgresql://user:pass@127.0.0.1:5432/transcriber_ai
# When empty, the app runs fine with in-memory jobs only (no history).
DATABASE_URL = os.environ.get("DATABASE_URL", "")

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
