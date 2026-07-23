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
| `WHISPER_MODEL` | `small` | `tiny` \| `base` \| `small` \| `medium` \| `large-v3`. Bigger = more accurate but slower. |
| `WHISPER_IMPL` | `faster` | `faster` (faster-whisper/CTranslate2, ~4× faster on CPU) or `openai` (original). |
| `WHISPER_DEVICE` | `auto` | `auto` uses CUDA if available, else CPU. Force with `cpu`/`cuda`. |
| `WHISPER_COMPUTE` | *(auto)* | Empty = `int8` on CPU / `float16` on CUDA. Or `int8_float16`, `float16`, `float32`. |
| `WHISPER_CPU_THREADS` | `0` | CTranslate2 CPU threads (0 = all cores). |
| `WHISPER_BEAM_SIZE` | `5` | `1` = greedy (fastest), `5` = best accuracy. |
| `WHISPER_VAD` | `true` | Skip silence via voice-activity detection (big win on long audio). |
| `GEMINI_API_KEY` | *(empty)* | Required only for the Gemini engine. Get one at https://aistudio.google.com/apikey. |
| `GEMINI_MODEL` | `gemini-2.5-flash` | Gemini model id. |
| `MAX_UPLOAD_BYTES` | `2147483648` (2 GiB) | Max upload / download size. |
| `DATABASE_URL` | *(empty)* | Optional PostgreSQL DSN. When set, transcripts are saved and shown as history; the `transcriptions` table is auto-created on startup. Also required for the admin dashboard. When empty, jobs are in-memory only. |
| `ADMIN_KEY` | *(empty)* | Credential for `/admin` and the admin API. **Empty = admin disabled (fail-closed).** |

> **Privacy:** With **Whisper**, audio never leaves your machine. With **Gemini**,
> audio is uploaded to Google for transcription.

---

## API

| Method & path | Description |
|---------------|-------------|
| `GET /api/languages` | Whisper language options (`{code, name}`), `auto` first. |
| `POST /api/transcribe` | multipart: `file` **or** `url`, plus `language`, `engine`. Returns `{job_id}`. |
| `GET /api/jobs/{id}` | Job `status`, `phase`, `progress`, and `result` when done. |
| `GET /api/media/{id}` | Streams the stored media for playback (supports HTTP range/seek). |
| `GET /api/transcriptions` | Recent submissions (history). |
| `GET /api/admin/submissions` · `/stats` | Admin list + aggregate stats. **Requires `X-Admin-Key` header.** |
| `DELETE /api/admin/submissions/{id}` | Delete a submission + its media file. Gated. |
| `POST /api/admin/submissions/{id}/retry` | Re-queue a (failed) submission. Gated. |

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

## Admin dashboard

Visit **`/admin`** (linked from the footer). It's gated by `ADMIN_KEY` — set it in
`.env`; if unset the dashboard and its API are disabled (fail-closed). Features:

- Table of all submissions: source, upload time, type, duration, status
  (`pending`/`done`/`error`), detected language.
- Aggregate stats (total / completed / pending / failed).
- **Open** a completed transcript, **Retry** a failed one, **Delete** a submission
  (removes the DB row *and* the stored media file).

Requires `DATABASE_URL` (submissions are stored in PostgreSQL).

## Review & Edit (two-panel)

At step 3 the screen splits: a **media player on the left** (audio or video, with
seek — click any segment timestamp to jump the player there) and the **editable
transcript on the right**, with `.txt`/`.srt` downloads pinned at the top.

## Making transcription faster (large files)

The default local engine is **faster-whisper** (CTranslate2) — roughly **4× faster on
CPU** than the original openai-whisper at the same accuracy, with lower memory. Levers,
by impact:

1. **Keep `WHISPER_IMPL=faster`** (default) with **int8** compute — the big CPU win.
2. **`WHISPER_VAD=true`** (default) — skips silence; large real-world files (meetings,
   podcasts) speed up a lot.
3. **All cores** — `WHISPER_CPU_THREADS=0` (default) uses every physical core.
4. **Smaller model / greedy decode** — `WHISPER_MODEL=base` and/or `WHISPER_BEAM_SIZE=1`
   trade a little accuracy for more speed.
5. **GPU** — if you have an NVIDIA GPU, install a CUDA build of PyTorch/CTranslate2;
   `WHISPER_DEVICE=auto` then runs on CUDA (fp16) for a 10–30× speedup.

The transcribe step reports **real streaming progress** with faster-whisper (segments
decode incrementally), so the progress bar advances on long files instead of sitting idle.

> **Supabase / hosted Postgres:** persistence works with any PostgreSQL. Point
> `DATABASE_URL` at your Supabase connection string (append `?sslmode=require`), e.g.
> `postgresql://postgres:<pw>@db.<ref>.supabase.co:5432/postgres?sslmode=require`.

## Supported input

`.wav`, `.m4a`, `.mp4`, `.mov`, `.webm`, `.mp3`, `.flac`, and public audio/video
URLs (YouTube or direct links). ffmpeg converts anything it can decode.
