"""Text-to-speech abstraction (PRD 7).

Default provider is "browser": the backend returns the response text and a
BCP-47 language hint, and the frontend speaks it via the Web Speech API. This
keeps V1 dependency-free while remaining replaceable by a server-side engine
later without changing callers.
"""

from __future__ import annotations

from app.schemas import TTSResult

_LANG_MAP = {
    "en": "en-IN",
    "hi": "hi-IN",
    "te": "te-IN",
}


def synthesize(text: str, lang: str | None = "en") -> TTSResult:
    bcp47 = _LANG_MAP.get((lang or "en"), "en-IN")
    # Browser provider: no audio bytes, frontend performs synthesis.
    return TTSResult(text=text, lang=bcp47, provider="browser", audio_base64=None)
