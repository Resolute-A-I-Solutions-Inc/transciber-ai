"""Regression tests for non-blocking transcription job submission."""
from __future__ import annotations

import threading
import time

from app import jobs


def test_submit_does_not_wait_for_slow_database(monkeypatch):
    database_started = threading.Event()
    release_database = threading.Event()
    submitted_workers = []

    def slow_insert(*_args):
        database_started.set()
        release_database.wait(timeout=2)

    monkeypatch.setattr(jobs.db, "enabled", lambda: True)
    monkeypatch.setattr(jobs.db, "insert_pending", slow_insert)
    monkeypatch.setattr(
        jobs._executor,
        "submit",
        lambda *args: submitted_workers.append(args),
    )

    started = time.perf_counter()
    job_id = jobs.submit(
        {"type": "file", "path": "test.wav", "name": "test.wav", "content_type": "audio/wav"},
        "whisper",
        "auto",
    )
    elapsed = time.perf_counter() - started

    try:
        assert job_id
        assert elapsed < 0.1
        assert submitted_workers
        assert database_started.wait(timeout=1)
    finally:
        release_database.set()