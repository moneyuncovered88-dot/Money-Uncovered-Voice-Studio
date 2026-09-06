# MUS Voices — FastAPI backend
# Python 3.12 (stable wheels) + FFmpeg (needed for audio assembly in later phases).

FROM python:3.12-slim

# System deps: ffmpeg for audio, plus certs.
RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies from pyproject (needs the package sources present).
# NOTE: app/ must include app/models — ensure it is committed (build rev 2).
COPY pyproject.toml ./
COPY app ./app
RUN test -f app/models/enums.py  # fail fast if app/models is missing from the build
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir .

# Railway/Render provide $PORT at runtime; default to 8000 locally.
ENV PORT=8000
EXPOSE 8000

# Shell form so ${PORT} is expanded by the host.
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
