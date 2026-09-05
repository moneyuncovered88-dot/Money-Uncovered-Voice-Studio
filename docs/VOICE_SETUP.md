# Voice setup & first narration

## Voice rights (read first)

Only upload recordings you **own or are explicitly licensed to use**. When you add a
voice, the app requires you to confirm:

> "I confirm that I own or have permission to use this voice."

That confirmation (and its timestamp) is stored with the voice. Do not clone the
voices of celebrities, creators, actors, or other people without authorization.

## Recommended reference recording

- **Length:** ~5–30 seconds of clean speech. *(Confirm the exact sweet spot against
  the official Chatterbox implementation in Phase 4.)*
- **Content:** natural, evenly-paced narration in the target style (calm, confident,
  documentary). Avoid music, background noise, heavy processing, or long silences.
- **Format:** WAV / MP3 / M4A / FLAC. The backend will convert to a clean mono WAV at
  a consistent sample rate and lightly trim dead air (Phase 2). It will **not**
  over-process your recording.

For the Money Uncovered narrator, aim for: General American accent, professional
financial-documentary tone, controlled pace, clear numbers.

## Add a voice (Phase 1)

1. Go to **Voices → Add voice**.
2. Fill in name, description, language, accent (`General American`), style
   (`Professional documentary`), and use case.
3. Tick the authorization confirmation.
4. Save.

> Reference-audio **upload + validation** (format, duration, quality) lands in
> **Phase 2 (Voice Management)**. In Phase 1 you create the voice profile metadata.

## Create and analyze a project (Phase 1)

1. **New Narration** → set a project name and video title.
2. Choose a voice and a narration preset (default: **Money Uncovered Documentary**).
3. Paste your script. The editor shows live **word count, character count, estimated
   duration, and chunk count** as you type.
4. **Save Draft.** Open the project to edit with autosave.

## Pronunciation dictionary

Add finance terms and how they should be spoken (e.g. `FICO → fy-co`,
`APR → A-P-R`, `S&P 500 → S and P five hundred`). Use the **Preview** box to see the
processed (spoken) text. Rules are boundary-safe (they won't corrupt unrelated words)
and longer phrases take precedence over shorter ones.

## Generate (Phase 4+)

Once the GPU worker and job engine are in place:

1. **Generate Preview** — synthesizes a short portion to check the voice/settings
   cheaply.
2. **Generate Full Narration** — chunks the script, generates each chunk, shows real
   progress (`Chunk 7 of 23`), retries failures, and resumes if interrupted.
3. **Assemble** — FFmpeg joins chunks with configured pauses and normalizes loudness.
4. **Fix a chunk** — edit one chunk's text, regenerate just that chunk, approve, and
   **Rebuild Final**.
5. **Download** — MP3 (default) or WAV. Filenames are derived from the project title
   (e.g. `money-uncovered-credit-cards-took-over-america.mp3`).
