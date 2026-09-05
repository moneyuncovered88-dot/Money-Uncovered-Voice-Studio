"""Structured (JSON) logging.

Emits one JSON object per line with contextual fields (request_id, job_id,
project_id, chunk_id, stage). Never logs secrets — callers must not pass
tokens, passwords, or keys into log records.
"""

from __future__ import annotations

import json
import logging
import sys
from datetime import UTC, datetime

# Fields we allow to be attached to a log record via `extra={...}`.
_CONTEXT_FIELDS = (
    "request_id",
    "job_id",
    "project_id",
    "chunk_id",
    "stage",
    "duration_ms",
    "user_id",
)


class JsonFormatter(logging.Formatter):
    """Render log records as compact JSON lines."""

    def format(self, record: logging.LogRecord) -> str:
        payload: dict[str, object] = {
            "ts": datetime.now(UTC).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        for field in _CONTEXT_FIELDS:
            value = getattr(record, field, None)
            if value is not None:
                payload[field] = value
        if record.exc_info:
            payload["exc"] = self.formatException(record.exc_info)
        return json.dumps(payload, ensure_ascii=False)


def configure_logging(level: str = "INFO") -> None:
    """Install the JSON formatter on the root logger (idempotent)."""
    root = logging.getLogger()
    root.setLevel(level.upper())

    # Replace existing handlers so re-running under reload stays clean.
    for handler in list(root.handlers):
        root.removeHandler(handler)

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JsonFormatter())
    root.addHandler(handler)

    # Quiet noisy third-party loggers a notch.
    logging.getLogger("uvicorn.access").setLevel("WARNING")


def get_logger(name: str) -> logging.Logger:
    return logging.getLogger(name)
