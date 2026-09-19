"""Voice pipeline endpoints (PRD 54).

POST /api/voice/transcribe  audio -> transcript (Whisper, Real Mode)
POST /api/voice/process     transcript -> structured command + confirmation
POST /api/voice/confirm     confirm/correct/cancel a pending command
POST /api/voice/cancel      cancel a pending command
GET  /api/voice/history     recent voice interactions
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import User, VoiceHistory
from app.schemas import (
    ConfirmRequest,
    ProcessRequest,
    TranscribeResponse,
    VoiceHistoryOut,
    VoiceProcessResponse,
)
from app.security import get_optional_user
from app.services import conversation_service as convo
from app.services import whisper_service

router = APIRouter(prefix="/api/voice", tags=["voice"])


@router.post("/transcribe", response_model=TranscribeResponse)
async def transcribe(
    audio: UploadFile = File(...),
    mode: str = Form("real"),
    language: str | None = Form(None),
):
    """Transcribe uploaded audio via Whisper (Real Mode only)."""
    allowed = {"audio/webm", "audio/wav", "audio/x-wav", "audio/wave", "audio/mpeg",
               "audio/mp4", "audio/x-m4a", "audio/ogg", "audio/mp3", "audio/flac",
               "application/octet-stream", ""}
    # Browsers send parametrized types like "audio/webm;codecs=opus"; compare
    # only the base MIME type.
    base_type = (audio.content_type or "").split(";")[0].strip().lower()
    if base_type not in allowed:
        raise HTTPException(status_code=415, detail=f"Unsupported audio type: {audio.content_type}")

    data = await audio.read()
    max_bytes = settings.max_audio_mb * 1024 * 1024
    if len(data) > max_bytes:
        raise HTTPException(status_code=413, detail=f"Audio exceeds {settings.max_audio_mb} MB limit.")

    if not whisper_service.is_available():
        raise HTTPException(
            status_code=503,
            detail="Speech-to-text is unavailable. Install a Whisper backend or use Simulation Mode.",
        )
    # Force the spoken language when the user selected one (te/hi/en); else auto.
    lang_code = (language or "").split("-")[0].lower() or None
    if lang_code not in ("te", "hi", "en"):
        lang_code = None
    try:
        transcript, detected = whisper_service.transcribe_bytes(
            data, audio.filename or "audio.webm", language=lang_code
        )
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"Transcription failed: {e}") from e
    return TranscribeResponse(transcript=transcript, language=detected or lang_code, backend="whisper")


@router.post("/process", response_model=VoiceProcessResponse)
def process(
    req: ProcessRequest,
    db: Session = Depends(get_db),
    user: User | None = Depends(get_optional_user),
):
    if not req.transcript.strip():
        raise HTTPException(status_code=400, detail="Transcript is empty.")
    return convo.process(
        db, req.transcript, req.mode, req.session_id,
        user.id if user else None,
        language_hint=req.language,
    )


@router.post("/confirm", response_model=VoiceProcessResponse)
def confirm(
    req: ConfirmRequest,
    db: Session = Depends(get_db),
    user: User | None = Depends(get_optional_user),
):
    return convo.confirm(db, req.session_id, req.answer, req.mode, user.id if user else None)


@router.post("/cancel", response_model=VoiceProcessResponse)
def cancel(
    req: ConfirmRequest,
    db: Session = Depends(get_db),
    user: User | None = Depends(get_optional_user),
):
    return convo.cancel(db, req.session_id, user.id if user else None)


@router.get("/history", response_model=list[VoiceHistoryOut])
def history(
    limit: int = 50,
    db: Session = Depends(get_db),
):
    rows = (
        db.query(VoiceHistory)
        .order_by(VoiceHistory.created_at.desc())
        .limit(min(limit, 200))
        .all()
    )
    return rows


@router.get("/status")
def voice_status():
    """Report which AI backends are actually available."""
    return {
        "whisper_available": whisper_service.is_available(),
        "gemini_available": settings.gemini_enabled,
        "default_mode": settings.default_mode,
    }
