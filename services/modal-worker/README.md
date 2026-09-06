# Modal Worker — Chatterbox-Turbo (free-tier GPU)

An alternative to the RunPod worker. Modal runs the same model with the same
request/response contract, on a GPU that scales to zero, using Modal's monthly
free credits.

## Deploy
```bash
pip install modal
modal token new                      # one-time browser auth
# a long random shared secret the backend will also use as MODAL_TOKEN:
modal secret create mu-voice-tts MU_TTS_TOKEN="$(python -c 'import secrets;print(secrets.token_urlsafe(32))')"
modal deploy services/modal-worker/app.py
```
`modal deploy` prints the **web endpoint URL** for `generate` (looks like
`https://<workspace>--mu-voice-tts-tts-generate.modal.run`). Copy it.

## Point the backend at it (Railway variables)
```
TTS_PROVIDER=modal
APP_ENV=production
MODAL_ENDPOINT_URL=<the printed URL>
MODAL_TOKEN=<the same random string you put in the secret>
```

## Contract
Identical to the RunPod worker (see `docs/RUNPOD_SETUP.md`): the backend POSTs
`{text, voice_reference_b64, voice_reference_ext, settings, token}` and gets back
`{status, audio_b64, sample_rate, duration_seconds, generation_ms, model_name}`.

## Notes
- First request per cold container downloads the model from Hugging Face
  (~1–2 min); after that the warm container is fast, then scales to zero.
- Modal API names drift between versions — if `modal deploy` errors, see the
  commented alternatives in `app.py` (`fastapi_endpoint`/`web_endpoint`,
  `scaledown_window`/`container_idle_timeout`).
- GPU is set to `A10G`; change in `app.py` if you prefer a cheaper card.
