"""FastAPI application entrypoint.

Serves the JSON API under /api. In production it also serves the built React
app from ``frontend/dist`` (single port); in dev the Vite server proxies /api.
"""
from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from . import db
from .config import DEV_ORIGINS, REPO_DIR
from .routes import admin as admin_router
from .routes import router

app = FastAPI(title="transcriber-ai")


@app.on_event("startup")
def _startup() -> None:
    # Create the transcriptions table if a database is configured (no-op otherwise).
    try:
        db.init_db()
    except Exception as exc:  # noqa: BLE001 - don't block startup on DB issues
        print(f"[transcriber-ai] DB init skipped: {exc}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=DEV_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)
app.include_router(admin_router)


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


_DIST = REPO_DIR / "frontend" / "dist"
if _DIST.is_dir():
    _assets = _DIST / "assets"
    if _assets.is_dir():
        app.mount("/assets", StaticFiles(directory=_assets), name="assets")

    @app.get("/")
    def _index() -> FileResponse:
        return FileResponse(_DIST / "index.html")

    @app.get("/{path:path}")
    def _spa(path: str) -> FileResponse:
        candidate = _DIST / path
        if candidate.is_file():
            return FileResponse(candidate)
        return FileResponse(_DIST / "index.html")  # SPA fallback
