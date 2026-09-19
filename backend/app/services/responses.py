"""Localized response generation (PRD 7, 60).

Produces the assistant's reply text in the language the shopkeeper spoke
(English / Hindi / Telugu). The frontend then speaks this text with a matching
TTS voice, so the reply is in the same language as the request.

Product names stay as stored; for Telugu we prefer the local name when present.
Numbers use Latin digits (commonly used across all three languages).
"""

from __future__ import annotations

_LANGS = ("en", "hi", "te")

# Unit tokens -> localized word.
_UNIT_WORDS: dict[str, dict[str, str]] = {
    "en": {
        "kg": "kg", "gram": "g", "g": "g", "litre": "litre", "ml": "ml",
        "piece": "pieces", "packet": "packets", "pack": "packets", "bag": "bags",
        "dozen": "dozen", "box": "boxes", "carton": "cartons", "quintal": "quintal",
    },
    "hi": {
        "kg": "किलो", "gram": "ग्राम", "g": "ग्राम", "litre": "लीटर", "ml": "मि.ली",
        "piece": "पीस", "packet": "पैकेट", "pack": "पैकेट", "bag": "बोरी",
        "dozen": "दर्जन", "box": "बॉक्स", "carton": "कार्टन", "quintal": "क्विंटल",
    },
    "te": {
        "kg": "కిలో", "gram": "గ్రాము", "g": "గ్రాము", "litre": "లీటరు", "ml": "మి.లీ",
        "piece": "ముక్కలు", "packet": "ప్యాకెట్లు", "pack": "ప్యాకెట్లు", "bag": "సంచులు",
        "dozen": "డజను", "box": "బాక్స్‌లు", "carton": "కార్టన్‌లు", "quintal": "క్వింటాల్",
    },
}


def _lang(lang: str | None) -> str:
    return lang if lang in _LANGS else "en"


def _num(value) -> str:
    try:
        return f"{float(value):g}"
    except (TypeError, ValueError):
        return str(value)


def unit_word(unit: str | None, lang: str | None) -> str:
    if not unit:
        return ""
    lg = _lang(lang)
    # Normalize spoken variants (kilo/kilos/kilograms -> kg) before translating.
    from app.services.unit_converter import normalize_unit_token

    token = normalize_unit_token(unit) or unit
    return _UNIT_WORDS[lg].get(token.lower(), token)


def _okay(lang: str) -> str:
    return {"en": "Okay. ", "hi": "ठीक है। ", "te": "సరే. "}[lang]


# --------------------------- Builders ---------------------------
def confirm_add(lang, qty, unit, name, *, again=False):
    lg = _lang(lang)
    q, u = _num(qty), unit_word(unit, lg)
    pre = _okay(lg) if again else ""
    body = {
        "en": f"Should I add {q} {u} to {name}?",
        "hi": f"क्या मैं {name} में {q} {u} जोड़ूँ?",
        "te": f"{name}కి {q} {u} add చేయమంటారా?",
    }[lg]
    return pre + body


def confirm_remove(lang, qty, unit, name, *, again=False):
    lg = _lang(lang)
    q, u = _num(qty), unit_word(unit, lg)
    pre = _okay(lg) if again else ""
    body = {
        "en": f"Should I remove {q} {u} from {name}?",
        "hi": f"क्या मैं {name} से {q} {u} निकालूँ?",
        "te": f"{name} నుండి {q} {u} తీసేయమంటారా?",
    }[lg]
    return pre + body


def confirm_correct(lang, current, base_unit, target, unit, name, *, again=False):
    lg = _lang(lang)
    cur, tgt = _num(current), _num(target)
    bu, u = unit_word(base_unit, lg), unit_word(unit, lg)
    pre = _okay(lg) if again else ""
    body = {
        "en": f"{name} is recorded at {cur} {bu}. Correct it to {tgt} {u}?",
        "hi": f"{name} अभी {cur} {bu} दर्ज है। इसे {tgt} {u} कर दूँ?",
        "te": f"{name} ప్రస్తుతం {cur} {bu} ఉంది. దీన్ని {tgt} {u} కి సరిచేయమంటారా?",
    }[lg]
    return pre + body


def executed_add(lang, qty, unit, name, stock, base_unit):
    lg = _lang(lang)
    q, u, bu, s = _num(qty), unit_word(unit, lg), unit_word(base_unit, lg), _num(stock)
    return {
        "en": f"Added {q} {u} to {name}. New stock: {s} {bu}.",
        "hi": f"{name} में {q} {u} जोड़ दिया। नया स्टॉक: {s} {bu}।",
        "te": f"{name}కి {q} {u} add చేశాను. ప్రస్తుత స్టాక్: {s} {bu}.",
    }[lg]


def executed_remove(lang, qty, unit, name, stock, base_unit):
    lg = _lang(lang)
    q, u, bu, s = _num(qty), unit_word(unit, lg), unit_word(base_unit, lg), _num(stock)
    return {
        "en": f"Removed {q} {u} from {name}. New stock: {s} {bu}.",
        "hi": f"{name} से {q} {u} निकाल दिया। नया स्टॉक: {s} {bu}।",
        "te": f"{name} నుండి {q} {u} తీసేశాను. ప్రస్తుత స్టాక్: {s} {bu}.",
    }[lg]


def executed_correct(lang, name, stock, base_unit):
    lg = _lang(lang)
    bu, s = unit_word(base_unit, lg), _num(stock)
    return {
        "en": f"{name} stock corrected to {s} {bu}.",
        "hi": f"{name} का स्टॉक {s} {bu} कर दिया।",
        "te": f"{name} స్టాక్ {s} {bu} కి సరిచేశాను.",
    }[lg]


def query_stock(lang, name, stock, base_unit):
    lg = _lang(lang)
    bu, s = unit_word(base_unit, lg), _num(stock)
    return {
        "en": f"You currently have {s} {bu} of {name}.",
        "hi": f"आपके पास अभी {name} का {s} {bu} है।",
        "te": f"మీ దగ్గర ప్రస్తుతం {name} {s} {bu} ఉంది.",
    }[lg]


def ask_quantity(lang, name, intent):
    lg = _lang(lang)
    if intent == "REMOVE":
        return {
            "en": f"How much {name} should I remove?",
            "hi": f"{name} कितना निकालूँ?",
            "te": f"{name} ఎంత తీసేయాలి?",
        }[lg]
    return {
        "en": f"How much {name} should I add?",
        "hi": f"{name} कितना जोड़ूँ?",
        "te": f"{name} ఎంత add చేయాలి?",
    }[lg]


def ask_correct_target(lang, name):
    lg = _lang(lang)
    return {
        "en": f"What should the {name} stock be corrected to?",
        "hi": f"{name} का स्टॉक कितना करना है?",
        "te": f"{name} స్టాక్ ఎంతకు సరిచేయాలి?",
    }[lg]


def clarify(lang, names):
    lg = _lang(lang)
    joined = ", ".join(names)
    return {
        "en": f"Which one do you mean: {joined}?",
        "hi": f"आप किसकी बात कर रहे हैं: {joined}?",
        "te": f"మీరు వేటి గురించి చెప్తున్నారు: {joined}?",
    }[lg]


def choose_product(lang, names):
    lg = _lang(lang)
    joined = ", ".join(names)
    return {
        "en": f"Please tell me which product: {joined}.",
        "hi": f"कृपया बताएँ कौन सा उत्पाद: {joined}।",
        "te": f"దయచేసి ఏ వస్తువో చెప్పండి: {joined}.",
    }[lg]


def which_to_check(lang):
    lg = _lang(lang)
    return {
        "en": "Which product would you like to check?",
        "hi": "आप किस उत्पाद की जानकारी चाहते हैं?",
        "te": "మీరు ఏ వస్తువు గురించి తెలుసుకోవాలనుకుంటున్నారు?",
    }[lg]


def not_found(lang):
    lg = _lang(lang)
    return {
        "en": "I couldn't find that product. Please repeat the product name.",
        "hi": "मुझे वह उत्पाद नहीं मिला। कृपया उत्पाद का नाम दोबारा बोलें।",
        "te": "ఆ వస్తువు దొరకలేదు. దయచేసి వస్తువు పేరు మళ్లీ చెప్పండి.",
    }[lg]


def insufficient(lang, name, avail, base_unit):
    lg = _lang(lang)
    bu, a = unit_word(base_unit, lg), _num(avail)
    return {
        "en": f"Only {a} {bu} of {name} are currently available.",
        "hi": f"{name} का केवल {a} {bu} उपलब्ध है।",
        "te": f"{name} ప్రస్తుతం {a} {bu} మాత్రమే ఉంది.",
    }[lg]


def cancelled(lang):
    lg = _lang(lang)
    return {
        "en": "Okay, cancelled. No changes were made.",
        "hi": "ठीक है, रद्द कर दिया। कोई बदलाव नहीं हुआ।",
        "te": "సరే, రద్దు చేశాను. ఏ మార్పులు జరగలేదు.",
    }[lg]


def not_understood(lang):
    lg = _lang(lang)
    return {
        "en": "I didn't understand that. Try, for example, 'Add 5 kg rice'.",
        "hi": "मैं समझ नहीं पाया। जैसे कहें: '5 किलो चावल जोड़ो'।",
        "te": "నాకు అర్థం కాలేదు. ఉదాహరణకు '5 కిలో బియ్యం add చేయి' అని చెప్పండి.",
    }[lg]


def please_confirm(lang):
    lg = _lang(lang)
    return {
        "en": "Please say 'yes' to confirm or 'no' to cancel.",
        "hi": "पुष्टि के लिए 'हाँ' या रद्द के लिए 'नहीं' कहें।",
        "te": "నిర్ధారించడానికి 'అవును' లేదా రద్దుకు 'వద్దు' అనండి.",
    }[lg]


def say_a_number(lang):
    lg = _lang(lang)
    return {
        "en": "Please say a number.",
        "hi": "कृपया एक संख्या बोलें।",
        "te": "దయచేసి ఒక సంఖ్య చెప్పండి.",
    }[lg]


def expired(lang):
    lg = _lang(lang)
    return {
        "en": "That request expired. Please start again.",
        "hi": "यह अनुरोध समाप्त हो गया। कृपया फिर से शुरू करें।",
        "te": "ఈ అభ్యర్థన గడువు ముగిసింది. దయచేసి మళ్లీ మొదలుపెట్టండి.",
    }[lg]


def product_gone(lang):
    lg = _lang(lang)
    return {
        "en": "The product no longer exists.",
        "hi": "यह उत्पाद अब मौजूद नहीं है।",
        "te": "ఈ వస్తువు ఇప్పుడు లేదు.",
    }[lg]
