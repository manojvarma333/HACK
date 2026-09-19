"""NLU service (PRD 6, 48).

Converts natural language (incl. code-mixed English/Hindi/Telugu) into a
structured command. Uses Gemini when configured, otherwise a deterministic
rule-based parser so the app works with no API key (Simulation Mode).

CRITICAL: this layer only interprets language. It never touches the database.
"""

from __future__ import annotations

import json
import re

from app.config import settings
from app.schemas import NLUResult

ALLOWED_INTENTS = {
    "ADD",
    "REMOVE",
    "QUERY",
    "CORRECT",
    "CANCEL",
    "CONFIRM",
    "CHANGE",
    "UNKNOWN",
}

# --- Rule-based lexicons (English + Hindi + Telugu, romanized + script) ---
_ADD_WORDS = ["add", "daal", "daalo", "cheyyi", "add cheyyi", "add karo", "jodo", "जोड़", "చేయి", "కలుపు"]
_REMOVE_WORDS = ["remove", "nikaal", "nikalo", "teyyi", "hटा", "हटा", "kam karo", "తీసేయి", "తీయి", "minus", "sold", "sale"]
_QUERY_WORDS = ["how much", "how many", "kitna", "kitne", "entha", "stock", "left", "remaining", "undi", "kya hai", "एंत", "ఎంత", "बचा"]
_CORRECT_WORDS = ["correct", "actually", "set to", "make it", "should be", "asalu", "సరిచేయి", "सही करो"]
_CANCEL_WORDS = ["cancel", "stop", "vaddu", "nahi", "no", "వద్దు", "नहीं", "रद्द"]
_CONFIRM_WORDS = ["yes", "yeah", "yep", "okay", "ok", "confirm", "avunu", "haan", "haan ji", "అవును", "हाँ", "sahi"]

_NUM_WORDS = {
    "one": 1, "two": 2, "three": 3, "four": 4, "five": 5, "six": 6,
    "seven": 7, "eight": 8, "nine": 9, "ten": 10, "dozen": 12,
    # Romanized Hindi
    "ek": 1, "do": 2, "teen": 3, "char": 4, "paanch": 5, "panch": 5,
    "chah": 6, "saat": 7, "aath": 8, "nau": 9, "das": 10,
    # Romanized Telugu
    "okati": 1, "rendu": 2, "moodu": 3, "nalugu": 4, "aidu": 5, "aydu": 5,
    "aaru": 6, "edu": 7, "enimidi": 8, "tommidi": 9, "padi": 10,
    # Hindi (Devanagari) number words
    "एक": 1, "दो": 2, "तीन": 3, "चार": 4, "पांच": 5, "पाँच": 5,
    "छह": 6, "छः": 6, "सात": 7, "आठ": 8, "नौ": 9, "दस": 10,
    # Telugu number words
    "ఒకటి": 1, "రెండు": 2, "మూడు": 3, "నాలుగు": 4, "ఐదు": 5,
    "ఆరు": 6, "ఏడు": 7, "ఎనిమిది": 8, "తೊమ్మిది": 9, "పది": 10,
}

# Indic digit characters -> ASCII, so "१०" / "౧౦" become "10".
_INDIC_DIGITS = {
    # Devanagari 0-9
    "०": "0", "१": "1", "२": "2", "३": "3", "४": "4",
    "५": "5", "६": "6", "७": "7", "८": "8", "९": "9",
    # Telugu 0-9
    "౦": "0", "౧": "1", "౨": "2", "౩": "3", "౪": "4",
    "౫": "5", "౬": "6", "౭": "7", "౮": "8", "౯": "9",
}

_UNIT_WORDS = [
    "kg", "kilo", "kilos", "kilogram", "kilograms", "gram", "grams", "g",
    "litre", "litres", "liter", "liters", "ml", "piece", "pieces", "pcs",
    "packet", "packets", "pack", "box", "boxes", "carton", "cartons",
    "bag", "bags", "dozen", "quintal",
]


def _detect_language(text: str) -> str:
    if re.search(r"[\u0900-\u097F]", text):
        return "hi"
    if re.search(r"[\u0C00-\u0C7F]", text):
        return "te"
    low = text.lower()
    if any(w in low for w in ["biyyam", "cheyyi", "entha", "undi", "vaddu", "avunu"]):
        return "te"
    if any(w in low for w in ["daal", "nikaal", "kitna", "karo", "haan", "chawal"]):
        return "hi"
    return "en"


def _first_match(text: str, words: list[str]) -> bool:
    low = text.lower()
    return any(w in low for w in words)


def _normalize_digits(text: str) -> str:
    return "".join(_INDIC_DIGITS.get(ch, ch) for ch in text)


def _extract_quantity(text: str) -> float | None:
    normalized = _normalize_digits(text)
    m = re.search(r"(\d+(?:\.\d+)?)", normalized)
    if m:
        return float(m.group(1))
    low = normalized.lower()
    for word, val in _NUM_WORDS.items():
        if re.search(rf"(?:\b|(?<=\s)){re.escape(word)}(?:\b|(?=\s))", low) or word in low:
            return float(val)
    return None


def _extract_unit(text: str) -> str | None:
    low = text.lower()
    for u in _UNIT_WORDS:
        if re.search(rf"\b{re.escape(u)}\b", low):
            return u
    return None


def _extract_item(text: str, quantity: float | None, unit: str | None) -> str | None:
    """Heuristic: strip intent/number/unit tokens, keep the remaining nouns."""
    low = f" {text.lower()} "
    stop = set()
    for group in (_ADD_WORDS, _REMOVE_WORDS, _QUERY_WORDS, _CORRECT_WORDS,
                  _CANCEL_WORDS, _CONFIRM_WORDS, _UNIT_WORDS):
        for w in group:
            stop.add(w)
    stop |= set(_NUM_WORDS)
    stop |= {"add", "of", "the", "to", "from", "do", "i", "have", "is", "are",
             "there", "please", "much", "many", "in", "my", "shop", "ka", "ki",
             "ko", "na", "and", "a", "an"}
    # remove numbers
    low = re.sub(r"\d+(?:\.\d+)?", " ", low)
    tokens = [t for t in re.split(r"[^\w\u0900-\u097F\u0C00-\u0C7F]+", low) if t]
    kept = [t for t in tokens if t not in stop]
    if not kept:
        return None
    return " ".join(kept).strip() or None


def rule_based_nlu(transcript: str) -> NLUResult:
    text = transcript.strip()
    quantity = _extract_quantity(text)
    unit = _extract_unit(text)

    if _first_match(text, _CONFIRM_WORDS) and not _first_match(text, _ADD_WORDS + _REMOVE_WORDS):
        return NLUResult(intent="CONFIRM", confidence=0.8)
    if _first_match(text, _CANCEL_WORDS) and not _first_match(text, _ADD_WORDS):
        return NLUResult(intent="CANCEL", confidence=0.8)
    # CORRECT is checked before QUERY because "correct ... stock" also contains
    # the query keyword "stock".
    if _first_match(text, _CORRECT_WORDS):
        item = _extract_item(text, quantity, unit)
        return NLUResult(
            intent="CORRECT", item=item, target_stock=quantity, unit=unit,
            confidence=0.75,
        )
    if _first_match(text, _QUERY_WORDS) and not _first_match(text, _ADD_WORDS + _REMOVE_WORDS):
        item = _extract_item(text, quantity, unit)
        return NLUResult(intent="QUERY", item=item, confidence=0.85)
    if _first_match(text, _REMOVE_WORDS):
        item = _extract_item(text, quantity, unit)
        return NLUResult(
            intent="REMOVE", item=item, quantity=quantity, unit=unit,
            confidence=0.85 if item else 0.5,
        )
    if _first_match(text, _ADD_WORDS):
        item = _extract_item(text, quantity, unit)
        return NLUResult(
            intent="ADD", item=item, quantity=quantity, unit=unit,
            confidence=0.85 if item else 0.5,
        )

    # No verb but has a product-ish + quantity -> assume ADD (common in speech).
    item = _extract_item(text, quantity, unit)
    if item and quantity is not None:
        return NLUResult(intent="ADD", item=item, quantity=quantity, unit=unit, confidence=0.55)
    if item:
        return NLUResult(intent="QUERY", item=item, confidence=0.5)
    return NLUResult(intent="UNKNOWN", confidence=0.2)


_GEMINI_PROMPT = """You are an inventory command parser for an Indian Kirana store.
The user may speak English, Hindi, Telugu, or a code-mixed combination.
Extract a single structured command. Respond with ONLY minified JSON, no prose.

Schema:
{"intent": one of ["ADD","REMOVE","QUERY","CORRECT","CANCEL","CONFIRM","CHANGE","UNKNOWN"],
 "item": product name in English if identifiable else the spoken term or null,
 "quantity": number or null,
 "unit": one of ["gram","kg","ml","litre","piece","dozen","packet","box","carton","bag","quintal"] or null,
 "target_stock": number or null (only for CORRECT),
 "reason": string or null,
 "confidence": number 0..1}

Transcript: {transcript}
JSON:"""


def _gemini_nlu(transcript: str) -> NLUResult | None:
    try:
        import google.generativeai as genai  # type: ignore
    except Exception:
        return None
    try:
        genai.configure(api_key=settings.gemini_api_key)
        model = genai.GenerativeModel(settings.gemini_model)
        prompt = _GEMINI_PROMPT.replace("{transcript}", transcript)
        resp = model.generate_content(prompt)
        raw = (resp.text or "").strip()
        raw = re.sub(r"^```(?:json)?|```$", "", raw.strip()).strip()
        data = json.loads(raw)
        intent = str(data.get("intent", "UNKNOWN")).upper()
        if intent not in ALLOWED_INTENTS:
            intent = "UNKNOWN"
        return NLUResult(
            intent=intent,
            item=data.get("item"),
            quantity=_as_float(data.get("quantity")),
            unit=data.get("unit"),
            target_stock=_as_float(data.get("target_stock")),
            reason=data.get("reason"),
            confidence=float(data.get("confidence", 0.7) or 0.7),
        )
    except Exception:
        return None


def _as_float(v) -> float | None:
    if v is None:
        return None
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def parse(transcript: str, mode: str = "simulation") -> tuple[NLUResult, str]:
    """Return (NLUResult, provider). Falls back to rules if Gemini unavailable."""
    if mode == "real" and settings.nlu_provider == "gemini" and settings.gemini_enabled:
        result = _gemini_nlu(transcript)
        if result is not None:
            return result, "gemini"
    return rule_based_nlu(transcript), "rule-based"
