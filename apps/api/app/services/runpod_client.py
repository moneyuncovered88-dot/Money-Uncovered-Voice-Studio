"""Thin RunPod Serverless client.

Sends a synchronous generation request to the configured endpoint and returns
the worker's `output`. Kept small and side-effect-free so providers can inject
a fake runner in tests.
"""

from __future__ import annotations

from typing import Any

import httpx

from app.config import get_settings
from app.errors import UpstreamError

_TERMINAL_FAILURES = {"FAILED", "CANCELLED", "TIMED_OUT"}


def run_sync(job_input: dict[str, Any], *, timeout: float = 300.0) -> dict[str, Any]:
    """Call `/runsync` and return the worker output dict.

    Raises UpstreamError on configuration, transport, or job failures.
    """
    settings = get_settings()
    if not (settings.runpod_api_key and settings.runpod_endpoint_id):
        raise UpstreamError(
            "RunPod is not configured (set RUNPOD_API_KEY and RUNPOD_ENDPOINT_ID).",
            code="runpod_not_configured",
            status_code=503,
        )

    url = f"https://api.runpod.ai/v2/{settings.runpod_endpoint_id}/runsync"
    try:
        response = httpx.post(
            url,
            headers={"Authorization": f"Bearer {settings.runpod_api_key}"},
            json={"input": job_input},
            timeout=timeout,
        )
        response.raise_for_status()
        body = response.json()
    except httpx.HTTPError as exc:
        raise UpstreamError(
            f"RunPod request failed: {exc}", code="runpod_error", status_code=502
        ) from exc

    status = str(body.get("status", "")).upper()
    if status == "COMPLETED":
        return body.get("output") or {}
    if status in _TERMINAL_FAILURES:
        raise UpstreamError(
            f"RunPod job {status.lower()}: {body.get('error') or 'no detail'}",
            code="runpod_job_failed",
            status_code=502,
        )
    raise UpstreamError(
        f"Unexpected RunPod status '{status or 'unknown'}' (runsync should complete inline).",
        code="runpod_error",
        status_code=502,
    )
