"""Media pipeline tests. Generate a tiny tone with ffmpeg, then convert/probe it."""
import shutil
import subprocess

import pytest

from app.media import probe_duration, to_wav16k

pytestmark = pytest.mark.skipif(
    shutil.which("ffmpeg") is None, reason="ffmpeg not installed"
)


@pytest.fixture()
def tone_mp4(tmp_path):
    """A 1-second silent-ish MP4 (sine audio) to exercise conversion."""
    src = tmp_path / "tone.mp4"
    subprocess.run(
        ["ffmpeg", "-y", "-f", "lavfi", "-i", "sine=frequency=440:duration=1",
         "-c:a", "aac", str(src)],
        capture_output=True, text=True, check=True,
    )
    return src


def test_to_wav16k_produces_wav(tone_mp4, tmp_path):
    out = to_wav16k(tone_mp4, tmp_path / "out.wav")
    assert out.exists()
    assert out.stat().st_size > 0


def test_probe_duration_reads_seconds(tone_mp4):
    dur = probe_duration(tone_mp4)
    assert 0.8 <= dur <= 1.5


def test_to_wav16k_bad_input_raises(tmp_path):
    bad = tmp_path / "notmedia.bin"
    bad.write_bytes(b"this is not media")
    with pytest.raises(RuntimeError):
        to_wav16k(bad, tmp_path / "x.wav")
