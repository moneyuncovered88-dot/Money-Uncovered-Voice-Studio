# Modal setup (free-tier GPU worker)

Modal is a Python-native serverless GPU platform with **monthly free credits**
and scale-to-zero — a good no-cost way to run Chatterbox-Turbo. It's an
alternative to RunPod; the app talks to either through the same contract.

## 1. Create an account
Sign up at https://modal.com. The starter plan includes recurring free credits
that cover a lot of TTS. Add a payment method only if you exceed them.

## 2. Install the CLI and authenticate
```bash
pip install modal
modal token new
```
`modal token new` opens a browser to link the CLI to your account (one-time).

## 3. Create the shared secret
The worker only answers requests carrying a secret token. Generate one and store
it as a Modal secret named `mu-voice-tts` with key `MU_TTS_TOKEN`:
```bash
modal secret create mu-voice-tts MU_TTS_TOKEN="$(python -c 'import secrets;print(secrets.token_urlsafe(32))')"
```
Keep a copy of that random string — you'll set it as `MODAL_TOKEN` on the backend.

## 4. Deploy the worker
```bash
modal deploy services/modal-worker/app.py
```
This builds the image (installs Chatterbox + Torch) and deploys the endpoint.
It prints a **web endpoint URL** for `generate`, e.g.:
```
https://<workspace>--mu-voice-tts-tts-generate.modal.run
```
Copy that URL.

## 5. Point the backend at Modal (Railway variables)
```
TTS_PROVIDER=modal
APP_ENV=production
MODAL_ENDPOINT_URL=<the URL from step 4>
MODAL_TOKEN=<the same random string from step 3>
```
Saving these redeploys the backend. Nothing else changes — the Generate flow now
produces real Chatterbox audio instead of the mock tone.

## 6. Test
In the app: open a project → **Preview** (short, exercises the endpoint) → then
**Generate**. The **first** request wakes a cold container and downloads the model
(~1–2 min); subsequent requests are fast, then it scales back to zero.

## Cost
Free credits cover a lot; beyond them Modal bills per-second of GPU time, only
while generating. Set `GPU_COST_PER_HOUR` on the backend to see cost estimates in
History.

## Troubleshooting
- **`modal deploy` errors on decorator names** — Modal's API drifts. In
  `services/modal-worker/app.py`, swap `@modal.fastapi_endpoint` for
  `@modal.web_endpoint`, and/or `scaledown_window` for `container_idle_timeout`,
  to match your installed `modal` version.
- **401 / "unauthorized"** — `MODAL_TOKEN` (backend) must equal the
  `MU_TTS_TOKEN` in the Modal secret.
- **Generation errors** — check the endpoint logs with `modal app logs mu-voice-tts`.
