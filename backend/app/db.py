"""Optional PostgreSQL persistence for transcription results.

Enabled only when ``DATABASE_URL`` is set; otherwise every function is a no-op
and the app runs with in-memory jobs alone. Kept deliberately small: one table,
a connection pool, and plain SQL.
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
    engine            TEXT,
    language          TEXT,
    status            TEXT NOT NULL,
    language_detected TEXT,
    full_text         TEXT,
    segments          JSONB,
    srt               TEXT,
    vtt               TEXT,
    error             TEXT
);
CREATE INDEX IF NOT EXISTS transcriptions_created_idx ON transcriptions (created_at DESC);
"""


def init_db() -> None:
    if not enabled():
        return
    with _pool_().connection() as conn:
        conn.execute(_DDL)


def save_result(job_id: str, source_type: str, source_name: str, engine: str,
                language: str, result: dict) -> None:
    if not enabled():
        return
    with _pool_().connection() as conn:
        conn.execute(
            """
            INSERT INTO transcriptions
                (id, source_type, source_name, engine, language, status,
                 language_detected, full_text, segments, srt, vtt, error)
            VALUES (%s,%s,%s,%s,%s,'done',%s,%s,%s,%s,%s,NULL)
            ON CONFLICT (id) DO UPDATE SET
                status='done',
                language_detected=EXCLUDED.language_detected,
                full_text=EXCLUDED.full_text,
                segments=EXCLUDED.segments,
                srt=EXCLUDED.srt,
                vtt=EXCLUDED.vtt,
                error=NULL
            """,
            (job_id, source_type, source_name, engine, language,
             result.get("language_detected", ""), result.get("full_text", ""),
             json.dumps(result.get("segments", [])), result.get("srt", ""),
             result.get("vtt", "")),
        )


def save_error(job_id: str, source_type: str, source_name: str, engine: str,
               language: str, error: str) -> None:
    if not enabled():
        return
    with _pool_().connection() as conn:
        conn.execute(
            """
            INSERT INTO transcriptions
                (id, source_type, source_name, engine, language, status, error)
            VALUES (%s,%s,%s,%s,%s,'error',%s)
            ON CONFLICT (id) DO UPDATE SET status='error', error=EXCLUDED.error
            """,
            (job_id, source_type, source_name, engine, language, error),
        )


def list_recent(limit: int = 50) -> list[dict]:
    if not enabled():
        return []
    from psycopg.rows import dict_row
    with _pool_().connection() as conn:
        cur = conn.cursor(row_factory=dict_row)
        cur.execute(
            """
            SELECT id, created_at, source_type, source_name, engine, status,
                   language_detected, left(coalesce(full_text,''), 200) AS preview
            FROM transcriptions
            ORDER BY created_at DESC
            LIMIT %s
            """,
            (limit,),
        )
        rows = cur.fetchall()
    for r in rows:
        r["created_at"] = r["created_at"].isoformat()
    return rows


def get_one(job_id: str) -> Optional[dict]:
    if not enabled():
        return None
    from psycopg.rows import dict_row
    with _pool_().connection() as conn:
        cur = conn.cursor(row_factory=dict_row)
        cur.execute("SELECT * FROM transcriptions WHERE id=%s", (job_id,))
        row = cur.fetchone()
    if row:
        row["created_at"] = row["created_at"].isoformat()
    return row
