# Railway backend image — FastAPI + faster-whisper (CPU / CTranslate2 int8).
# No torch/CUDA: faster-whisper runs on CTranslate2, so the image stays lean.
FROM python:3.11-slim

# ffmpeg is required at runtime (audio extraction + duration probe in media.py).
RUN apt-get update \
 && apt-get install -y --no-install-recommends ffmpeg \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python deps first for better layer caching.
COPY requirements-deploy.txt ./
RUN pip install --no-cache-dir -r requirements-deploy.txt

# App code.
COPY backend/ ./backend/

WORKDIR /app/backend

ENV PYTHONUNBUFFERED=1 \
    WHISPER_IMPL=faster \
    WHISPER_DEVICE=cpu \
    UPLOAD_DIR=/data/uploads

# Railway injects $PORT; default 8000 for local `docker run`.
EXPOSE 8000
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
