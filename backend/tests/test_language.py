"""Reply language matches the spoken language (PRD 7)."""

from app.services import conversation_service as convo


def _telugu(text: str) -> bool:
    return any("\u0c00" <= ch <= "\u0c7f" for ch in text)


def _devanagari(text: str) -> bool:
    return any("\u0900" <= ch <= "\u097f" for ch in text)


def test_telugu_add_replies_in_telugu(db):
    r = convo.process(db, "5 kilo biyyam add cheyyi", mode="simulation")
    assert r.language == "te"
    assert _telugu(r.response_text), r.response_text
    assert r.tts and r.tts.lang == "te-IN"
    done = convo.confirm(db, r.session_id, "avunu")
    assert done.state == "EXECUTED"
    assert _telugu(done.response_text), done.response_text
    assert done.tts and done.tts.lang == "te-IN"


def test_hindi_add_replies_in_hindi(db):
    r = convo.process(db, "cheeni 10 kilo add karo", mode="simulation")
    assert r.language == "hi"
    assert _devanagari(r.response_text), r.response_text
    assert r.tts and r.tts.lang == "hi-IN"


def test_english_stays_english(db):
    r = convo.process(db, "Add 5 kg rice", mode="simulation")
    assert r.language == "en"
    assert r.tts and r.tts.lang == "en-IN"
    assert not _telugu(r.response_text) and not _devanagari(r.response_text)


def test_telugu_query_in_telugu(db):
    r = convo.process(db, "biyyam entha undi?", mode="simulation")
    assert r.language == "te"
    assert r.state == "QUERY"
    assert _telugu(r.response_text), r.response_text
