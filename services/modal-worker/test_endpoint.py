"""Smoke-test the deployed Modal TTS endpoint directly.

Usage:
    python services/modal-worker/test_endpoint.py
    python services/modal-worker/test_endpoint.py "Some custom text to speak."

Posts one short request to the Modal web endpoint, checks the response, and
saves the returned audio to modal_test_output.wav next to this script.

The first call cold-starts a GPU container and downloads the model
(~1-2 min) — the script waits up to 5 minutes. Later calls are fast.
"""

from __future__ import annotations

import base64
import json
import pathlib
import sys
import time
import urllib.error
import urllib.request

# --- config (matches what you set on Railway) --------------------------------
ENDPOINT_URL = "https://moneyuncovered88--mu-voice-tts-tts-generate.modal.run"
TOKEN = "MbRQfwhdjp-3s10x5VQhBOjYBnl-pMuxUUck6-82c0c"
TIMEOUT_SECONDS = 300  # allow for a cold GPU start + model download
# -----------------------------------------------------------------------------

DEFAULT_TEXT = (
    "Hello, this is a test of the Money Uncovered voice studio. "
    "If you can hear this clearly, the GPU worker is working."
)


def main() -> int:
    text = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_TEXT

    payload = {
        "token": TOKEN,
        "text": text,
        "settings": {"exaggeration": 0.5, "cfg_weight": 0.5, "temperature": 0.8},
        "output_format": "wav",
    }
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        ENDPOINT_URL,
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    print(f"POST {ENDPOINT_URL}")
    print(f"  text: {text!r}")
    print("  waiting (first call cold-starts the GPU, up to a few minutes)...")
    start = time.perf_counter()
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT_SECONDS) as resp:
            body = resp.read()
    except urllib.error.HTTPError as exc:
        print(f"\nHTTP {exc.code} error: {exc.read().decode('utf-8', 'replace')}")
        return 1
    except urllib.error.URLError as exc:
        print(f"\nRequest failed: {exc.reason}")
        return 1
    elapsed = time.perf_counter() - start

    try:
        result = json.loads(body)
    except json.JSONDecodeError:
        print(f"\nResponse was not JSON:\n{body[:500]!r}")
        return 1

    status = result.get("status")
    if status != "completed":
        print(f"\nWorker returned status={status!r}: {result.get('error')}")
        return 1

    audio_b64 = result.get("audio_b64") or ""
    audio = base64.b64decode(audio_b64)
    out_path = pathlib.Path(__file__).with_name("modal_test_output.wav")
    out_path.write_bytes(audio)

    print("\nSUCCESS")
    print(f"  round-trip:       {elapsed:.1f}s")
    print(f"  status:           {status}")
    print(f"  sample_rate:      {result.get('sample_rate')} Hz")
    print(f"  duration:         {result.get('duration_seconds')} s")
    print(f"  generation_ms:    {result.get('generation_ms')} ms (GPU time)")
    print(f"  model:            {result.get('model_name')}")
    print(f"  audio bytes:      {len(audio):,}")
    print(f"  saved to:         {out_path}")
    print("\nOpen the .wav file to listen.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
