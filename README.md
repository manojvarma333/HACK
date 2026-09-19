# VoiceStock AI

> **Your Shop. Your Voice. Your Inventory.**

A voice-first, multilingual (English / Hindi / Telugu, incl. code-mixed) inventory
management application for Indian Kirana stores.

This repository contains:

```
HACK/
├── project/      # Frontend  — React + Vite + TypeScript + Tailwind
└── backend/      # Backend   — FastAPI + SQLAlchemy + SQLite
```

## Architecture (voice pipeline)

```
Microphone → MediaRecorder → /api/voice/transcribe (Whisper)
          → transcript → /api/voice/process (NLU)
          → structured command → product resolution → unit conversion
          → validation → confirmation → /api/voice/confirm
          → inventory business logic → SQLite → transaction + alerts
          → response text → TTS (browser Web Speech) → shopkeeper
```

**Critical rule:** the LLM/NLU layer only *interprets* language and returns
structured JSON. It never touches the database. All inventory mutations pass
through validated Python business logic in `backend/app/services/inventory_service.py`.

## Modes (PRD §8)

- **Simulation Mode** (default): rule-based NLU + browser speech recognition.
  Works with **no API keys and no ML models installed**. Great for demos/dev.
- **Real Mode**: server-side Whisper for speech-to-text and (optionally) Gemini
  for NLU. Gracefully degrades to the rule-based parser if Gemini isn't configured.

## Prerequisites

- Python 3.10+ (tested on 3.13)
- Node.js 18+

## Backend setup

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
Copy-Item .env.example .env         # then edit .env as needed
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

- API root: http://localhost:8000
- Swagger docs: http://localhost:8000/api/docs
- The database is created and seeded with demo products on first startup.

### Optional AI dependencies (Real Mode only)

```powershell
# Speech-to-text (choose one)
pip install faster-whisper        # recommended, lighter
pip install openai-whisper        # needs torch + ffmpeg

# NLU
pip install google-generativeai   # then set GEMINI_API_KEY in .env
```

## Frontend setup

```powershell
cd project
npm install
Copy-Item .env.example .env        # VITE_API_URL=http://localhost:8000
npm run dev
```

Open http://localhost:5173 and go to **Voice Assistant**.

## Testing

```powershell
cd backend
.\.venv\Scripts\python.exe -m pytest -q
```

Covers unit conversion, inventory logic, and the end-to-end voice flow
(English + code-mixed Telugu, confirmation, correction, cancellation,
negative-stock protection, stock correction).

## Try it (Simulation Mode, no keys required)

On the Voice Assistant page, type or click a sample command:

- `Add 5 kg rice`
- `5 kilo biyyam add cheyyi`
- `Cheeni 10 kilo add karo`
- `How much rice is left?`
- `Remove 2 kg sugar`
- `Correct rice stock to 80 kg`

Then confirm with **Confirm** / `yes` / `avunu`, correct with e.g. `no, 5 kilo`,
or **Cancel**.

## Environment variables

See `backend/.env.example` and `project/.env.example`. Secrets (JWT secret,
Gemini API key, DB URL) live only in the backend `.env` and are never exposed
to the frontend.

## Status

The voice pipeline is complete and tested end-to-end. See the in-repo notes for
the remaining PRD modules being built out (analytics, alerts, suppliers,
purchases, settings pages, PWA, and full auth screens).
