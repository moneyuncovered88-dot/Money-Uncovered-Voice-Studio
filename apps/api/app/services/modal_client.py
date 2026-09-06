"""Modal transport for the TTS worker.

Posts the same generation payload the RunPod worker accepts to a Modal web
endpoint and returns the worker output dict. Modal returns the output directly
(no queue wrapper), so this is a plain authenticated POST.
"""

from __future__ import annotations

from typing import Any

import httpx

from app.config import get_settings
from app.errors import UpstreamError


def run_sync(job_input: dict[str, Any], *, timeout: float = 600.0) -> dict[str, Any]:
    settings = get_settings()
    if not settings.modal_endpoint_url:
        raise UpstreamError(
            "Modal is not configured (set MODAL_ENDPOINT_URL).",
            code="modal_not_configured",
            status_code=503,
        )
    # The Modal worker checks a shared token carried in the request body.
    body = dict(job_input)
    if settings.modal_token:
        body["token"] = settings.modal_token
    try:
        response = httpx.post(settings.modal_endpoint_url, json=body, timeout=timeout)
        response.raise_for_status()
        return response.json()
    except httpx.HTTPError as exc:
        raise UpstreamError(
            f"Modal request failed: {exc}", code="modal_error", status_code=502
        ) from exc
