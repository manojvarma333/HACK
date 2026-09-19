"""Speech-to-text service (PRD 5).

Whisper runs on the backend and is OPTIONAL. In Simulation Mode (or when no
model is installed) audio is not transcribed by a model; callers should send a
transcript directly. This module lazily loads the model so importing the app
never requires torch/whisper.
"""

from __future__ import annotations

import tempfile
from functools import lru_cache

from app.config import settings


class WhisperUnavailable(RuntimeError):
    pass


@lru_cache(maxsize=1)
def _load_faster_whisper():
    from faster_whisper import WhisperModel  # type: ignore

    return WhisperModel(
        settings.whisper_model,
        device=settings.whisper_device,
        compute_type=settings.whisper_compute_type,
    )


@lru_cache(maxsize=1)
def _load_openai_whisper():
    import whisper  # type: ignore

    return whisper.load_model(settings.whisper_model)


def is_available() -> bool:
    if not settings.whisper_enabled:
        return False
    try:
        if settings.whisper_backend == "openai-whisper":
            import whisper  # noqa: F401
        else:
            import faster_whisper  # noqa: F401
        return True
    except Exception:
        return False


def transcribe_bytes(
    audio: bytes, filename: str = "audio.webm", language: str | None = None
) -> tuple[str, str | None]:
    """Transcribe raw audio bytes. Returns (transcript, language).

    `language` (e.g. 'te', 'hi', 'en') forces Whisper to decode in that
    language instead of auto-detecting, which prevents Telugu speech from being
    misread as Hindi. Pass None to auto-detect.

    Raises WhisperUnavailable if no STT backend is installed/enabled.
    """
    if not is_available():
        raise WhisperUnavailable(
            "Whisper is not installed/enabled. Install a backend or use Simulation Mode."
        )

    suffix = "." + filename.rsplit(".", 1)[-1] if "." in filename else ".webm"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(audio)
        tmp_path = tmp.name

    try:
        if settings.whisper_backend == "openai-whisper":
            model = _load_openai_whisper()
            result = model.transcribe(tmp_path, language=language)
            return str(result.get("text", "")).strip(), result.get("language")
        model = _load_faster_whisper()
        segments, info = model.transcribe(tmp_path, beam_size=5, language=language)
        text = " ".join(seg.text for seg in segments).strip()
        return text, getattr(info, "language", None)
    finally:
        import os

        try:
            os.unlink(tmp_path)
        except OSError:
            pass
