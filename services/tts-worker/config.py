"""Worker configuration from environment variables."""

from __future__ import annotations

import os

# "cuda" on a GPU worker; "cpu" only works with the nano model.
DEVICE = os.getenv("TTS_DEVICE", "cuda")

# Use the 110M nano model (CPU-capable) instead of the 350M turbo model.
NANO = os.getenv("TTS_NANO", "false").lower() in ("1", "true", "yes")

# Recorded with every generation for reproducibility/versioning.
MODEL_NAME = os.getenv("MODEL_NAME", "chatterbox-turbo")

# Max characters accepted per request (defense in depth; backend also chunks).
MAX_TEXT_CHARS = int(os.getenv("MAX_TEXT_CHARS", "1200"))
