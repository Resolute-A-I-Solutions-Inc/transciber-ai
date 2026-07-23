"""Optional PostgreSQL persistence for submissions + transcription results.

Enabled only when ``DATABASE_URL`` is set; otherwise every function is a no-op.
One ``transcriptions`` table holds the full lifecycle of a submission
(pending -> done/error) and powers both the history list and the admin dashboard.
"""
from __future__ import annotations

import json
from typing import Optional

from .config import DATABASE_URL

_pool = None  # lazy psycopg_pool.ConnectionPool


def enabled() -> bool:
    return bool(DATABASE_URL)


def _pool_():
    global _pool
    if _pool is None:
        from psycopg_pool import ConnectionPool
        _pool = ConnectionPool(DATABASE_URL, min_size=1, max_size=4, open=True,
                               kwargs={"autocommit": True})
    return _pool


_DDL = """
CREATE TABLE IF NOT EXISTS transcriptions (
    id                TEXT PRIMARY KEY,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    source_type       TEXT,
    source_name       TEXT,
    source_url        TEXT,
    engine            TEXT,
    language          TEXT,
    status            TEXT NOT NULL,
    language_detected TEXT,
    full_text         TEXT,
    segments          JSONB,
    srt               TEXT,
    vtt               TEXT,
    error             TEXT,
    media_path        TEXT,
    content_type      TEXT,
    duration          DOUBLE PRECISION
);
CREATE INDEX IF NOT EXISTS transcriptions_created_idx ON transcriptions (created_at DESC);
-- migrate older tables that predate the newer columns:
ALTER TABLE transcriptions ADD COLUMN IF NOT EXISTS source_url   TEXT;
ALTER TABLE transcriptions ADD COLUMN IF NOT EXISTS media_path   TEXT;
ALTER TABLE transcriptions ADD COLUMN IF NOT EXISTS content_type TEXT;
ALTER TABLE transcriptions ADD COLUMN IF NOT EXISTS duration     DOUBLE PRECISION;
"""


def init_db() -> None:
    if not enabled():
        return
    with _pool_().connection() as conn:
        conn.execute(_DDL)


def insert_pending(job_id: str, source_type: str, source_name: str, source_url: str,
                   engine: str, language: str, media_path: str, content_type: str) -> None:
    if not enabled():
        return
    with _pool_().connection() as conn:
        conn.execute(
            """
            INSERT INTO transcriptions
                (id, source_type, source_name, source_url, engine, language,
                 status, media_path, content_type)
            VALUES (%s,%s,%s,%s,%s,%s,'pending',%s,%s)
            ON CONFLICT (id) DO UPDATE SET
                status='pending', error=NULL, source_url=EXCLUDED.source_url,
                media_path=EXCLUDED.media_path, content_type=EXCLUDED.content_type
            """,
            (job_id, source_type, source_name, source_url, engine, language,
             media_path, content_type),
        )


def set_media(job_id: str, media_path: str, content_type: str) -> None:
    if not enabled():
        return
    with _pool_().connection() as conn:
        conn.execute(
            "UPDATE transcriptions SET media_path=%s, content_type=%s WHERE id=%s",
            (media_path, content_type, job_id),
        )


def mark_done(job_id: str, result: dict, duration: float = 0.0) -> None:
    if not enabled():
        return
    with _pool_().connection() as conn:
        conn.execute(
            """
            UPDATE transcriptions SET
                status='done', error=NULL,
                language_detected=%s, full_text=%s, segments=%s, srt=%s, vtt=%s,
                duration=%s
            WHERE id=%s
            """,
            (result.get("language_detected", ""), result.get("full_text", ""),
             json.dumps(result.get("segments", [])), result.get("srt", ""),
             result.get("vtt", ""), duration, job_id),
        )


def mark_error(job_id: str, error: str) -> None:
    if not enabled():
        return
    with _pool_().connection() as conn:
        conn.execute("UPDATE transcriptions SET status='error', error=%s WHERE id=%s",
                     (error, job_id))


def _dict_cursor(conn):
    from psycopg.rows import dict_row
    return conn.cursor(row_factory=dict_row)


def _iso(row: dict) -> dict:
    if row and row.get("created_at") is not None:
        row["created_at"] = row["created_at"].isoformat()
    return row


def list_recent(limit: int = 50) -> list[dict]:
    """For the landing-page history: recent submissions with a text preview."""
    if not enabled():
        return []
    with _pool_().connection() as conn:
        cur = _dict_cursor(conn)
        cur.execute(
            """
            SELECT id, created_at, source_type, source_name, engine, status,
                   language_detected, content_type,
                   left(coalesce(full_text,''), 200) AS preview
            FROM transcriptions ORDER BY created_at DESC LIMIT %s
            """,
            (limit,),
        )
        return [_iso(r) for r in cur.fetchall()]


def get_one(job_id: str) -> Optional[dict]:
    if not enabled():
        return None
    with _pool_().connection() as conn:
        cur = _dict_cursor(conn)
        cur.execute("SELECT * FROM transcriptions WHERE id=%s", (job_id,))
        row = cur.fetchone()
    return _iso(row) if row else None


def list_all(limit: int = 500) -> list[dict]:
    """For the admin dashboard: all submissions with metadata (no heavy text)."""
    if not enabled():
        return []
    with _pool_().connection() as conn:
        cur = _dict_cursor(conn)
        cur.execute(
            """
            SELECT id, created_at, source_type, source_name, source_url, engine,
                   language, status, language_detected, content_type, duration,
                   (segments IS NOT NULL) AS has_transcript
            FROM transcriptions ORDER BY created_at DESC LIMIT %s
            """,
            (limit,),
        )
        return [_iso(r) for r in cur.fetchall()]


def stats() -> dict:
    if not enabled():
        return {"total": 0, "done": 0, "pending": 0, "error": 0}
    with _pool_().connection() as conn:
        cur = _dict_cursor(conn)
        cur.execute(
            """
            SELECT count(*) AS total,
                   count(*) FILTER (WHERE status='done')    AS done,
                   count(*) FILTER (WHERE status='pending') AS pending,
                   count(*) FILTER (WHERE status='error')   AS error
            FROM transcriptions
            """
        )
        return cur.fetchone()


def get_media(job_id: str) -> Optional[tuple[str, str]]:
    """Return (media_path, content_type) for the media-serving endpoint."""
    if not enabled():
        return None
    with _pool_().connection() as conn:
        row = conn.execute(
            "SELECT media_path, content_type FROM transcriptions WHERE id=%s", (job_id,)
        ).fetchone()
    if not row or not row[0]:
        return None
    return row[0], (row[1] or "application/octet-stream")


def get_retry_info(job_id: str) -> Optional[dict]:
    """Fields needed to re-run a submission."""
    if not enabled():
        return None
    with _pool_().connection() as conn:
        cur = _dict_cursor(conn)
        cur.execute(
            """SELECT id, source_type, source_name, source_url, engine, language,
                      media_path, content_type FROM transcriptions WHERE id=%s""",
            (job_id,),
        )
        return cur.fetchone()


def delete(job_id: str) -> Optional[str]:
    """Delete a submission row; return its media_path (basename) so the caller
    can remove the file, or None if not found."""
    if not enabled():
        return None
    with _pool_().connection() as conn:
        row = conn.execute(
            "DELETE FROM transcriptions WHERE id=%s RETURNING media_path", (job_id,)
        ).fetchone()
    return row[0] if row else None
