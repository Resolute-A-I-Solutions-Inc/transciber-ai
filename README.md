# transcriber.ai

A self-contained, local full-stack app that transcribes **audio & video** — from
a file upload or a public URL — using **local OpenAI Whisper** (private, no API
cost) with **Google Gemini** as an optional cloud engine. It has a drag-and-drop
UI, a 3-step workflow (Upload → Transcribe → Review & Edit), an editable
transcript with timestamps, and `.txt` / `.srt` downloads.

- **Backend:** FastAPI (Python 3.11) with an async job worker — a `POST` starts a
  job and returns immediately; the UI polls for progress, so large files never
  hit an HTTP timeout.
- **Frontend:** React + Vite (TypeScript).
- **Media:** `yt-dlp` fetches URLs (YouTube + direct links); `ffmpeg` normalizes
  everything to 16 kHz mono WAV.

---

## Prerequisites

| Tool | Notes |
|------|-------|
| **ffmpeg** (+ ffprobe) | Must be on your `PATH`. Verify: `ffmpeg -version`. |
| **Python 3.11** | Installed/managed via [`uv`](https://docs.astral.sh/uv/). Whisper/PyTorch have reliable 3.11 wheels; newer Pythons may not. |
| **Node.js 18+** & npm | For the frontend. |

> This app runs Whisper on **CPU** unless you install a CUDA build of PyTorch.
> Large files can take a while; choose a smaller `WHISPER_MODEL` if needed.

---

## Setup

```bash
# 1. Configuration (optional — sensible defaults work out of the box)
cp .env.example .env        # then edit if you want Gemini or a different model

# 2. Backend: create a Python 3.11 virtualenv and install deps
uv venv --python 3.11 .venv
uv pip install --python .venv/Scripts/python.exe -r requirements.txt
#   (macOS/Linux: use --python .venv/bin/python)

# 3. Frontend deps
cd frontend && npm install && cd ..
```

---

## Run

### Development (two terminals, hot reload)

```bash
# Terminal 1 — backend API on :8000
cd backend
../.venv/Scripts/python.exe -m uvicorn app.main:app --reload --port 8000

# Terminal 2 — frontend dev server on :5173 (proxies /api to :8000)
cd frontend
npm run dev
```

Open **http://localhost:5173**.

### Production (single port)

```bash
# Build the frontend once; FastAPI then serves it from frontend/dist
cd frontend && npm run build && cd ..
cd backend
../.venv/Scripts/python.exe -m uvicorn app.main:app --port 8000
```

Open **http://localhost:8000**.

---

## Configuration (`.env`)

| Variable | Default | Purpose |
|----------|---------|---------|
| `TRANSCRIBE_ENGINE` | `whisper` | Default engine (`whisper` or `gemini`); switchable in the UI. |
| `WHISPER_MODEL` | `small` | `tiny` \| `base` \| `small` \| `medium` \| `large`. Bigger = more accurate but slower. |
| `GEMINI_API_KEY` | *(empty)* | Required only for the Gemini engine. Get one at https://aistudio.google.com/apikey. |
| `GEMINI_MODEL` | `gemini-2.5-flash` | Gemini model id. |
| `MAX_UPLOAD_BYTES` | `2147483648` (2 GiB) | Max upload / download size. |

> **Privacy:** With **Whisper**, audio never leaves your machine. With **Gemini**,
> audio is uploaded to Google for transcription.

---

## API

| Method & path | Description |
|---------------|-------------|
| `GET /api/languages` | Whisper language options (`{code, name}`), `auto` first. |
| `POST /api/transcribe` | multipart: `file` **or** `url`, plus `language`, `engine`. Returns `{job_id}`. |
| `GET /api/jobs/{id}` | Job `status`, `phase`, `progress`, and `result` when done. |

Result schema:

```json
{
  "segments": [{ "start": 0.0, "end": 2.5, "text": "..." }],
  "full_text": "...",
  "language_detected": "en",
  "srt": "...", "vtt": "..."
}
```

---

## Tests

```bash
cd backend
../.venv/Scripts/python.exe -m pytest -q
```

Covers subtitle formatting, Whisper language codes, and the ffmpeg media pipeline.

---

## Supported input

`.wav`, `.m4a`, `.mp4`, `.mov`, `.webm`, `.mp3`, `.flac`, and public audio/video
URLs (YouTube or direct links). ffmpeg converts anything it can decode.
