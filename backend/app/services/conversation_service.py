"""Conversation orchestration (PRD 19-22, 28-29, 47-48).

Ties the pipeline together: NLU -> product resolution -> unit conversion ->
validation -> confirmation/correction -> execution. Maintains lightweight
in-memory session state so multi-turn confirmation and correction work.

All reply text is generated in the language the shopkeeper spoke (English /
Hindi / Telugu) via `responses`, so the assistant answers in the same language.
"""

from __future__ import annotations

import time
import uuid
from dataclasses import dataclass, field

from sqlalchemy.orm import Session

from app.models import Product, VoiceHistory
from app.schemas import (
    NLUResult,
    PipelineStage,
    ResolvedProduct,
    VoiceProcessResponse,
)
from app.services import inventory_service as inv
from app.services import nlu_service, responses, tts_service
from app.services import product_resolver as pr

# Very small in-memory store. Production could move this to Redis/DB.
_SESSIONS: dict[str, "PendingCommand"] = {}
_SESSION_TTL = 15 * 60  # seconds


@dataclass
class PendingCommand:
    session_id: str
    intent: str
    product_id: str | None
    product_name: str | None
    quantity: float | None
    unit: str | None
    target_stock: float | None
    language: str | None
    candidates: list[ResolvedProduct] = field(default_factory=list)
    awaiting: str = "confirmation"  # confirmation | clarify | missing_qty
    created_at: float = field(default_factory=time.time)


def _gc() -> None:
    now = time.time()
    for sid in [s for s, p in _SESSIONS.items() if now - p.created_at > _SESSION_TTL]:
        _SESSIONS.pop(sid, None)


def _stage(name: str, status: str, detail: str | None = None, ms: int | None = None) -> PipelineStage:
    return PipelineStage(stage=name, status=status, detail=detail, duration_ms=ms)


def _lang_of(lang_hint: str | None, transcript: str) -> str:
    # lang_hint may be a BCP-47 tag like 'te-IN', 'hi-IN'. Extract the language code.
    if lang_hint:
        code = lang_hint.split('-')[0].lower()
        if code in ("te", "hi", "en"):
            return code
    return nlu_service._detect_language(transcript)


def _display_name(product: Product, lang: str | None) -> str:
    """Prefer the local (Telugu) product name for Telugu replies."""
    if lang == "te" and product.name_local:
        return product.name_local
    return product.name


def _record_history(db, user_id, transcript, nlu, language, product_name, status, response) -> None:
    db.add(
        VoiceHistory(
            user_id=user_id, transcript=transcript, language=language,
            intent=nlu.intent, product_name=product_name, quantity=nlu.quantity,
            unit=nlu.unit, confidence=nlu.confidence, status=status, response=response,
        )
    )
    db.commit()


def _resolved(product: Product, score: float = 100.0) -> ResolvedProduct:
    return ResolvedProduct(id=product.id, name=product.name, score=score)


def process(
    db: Session,
    transcript: str,
    mode: str = "simulation",
    session_id: str | None = None,
    user_id: str | None = None,
    language_hint: str | None = None,
) -> VoiceProcessResponse:
    _gc()
    pipeline: list[PipelineStage] = [_stage("Voice Received", "ok", transcript)]

    if session_id and session_id in _SESSIONS:
        return _continue(db, transcript, mode, _SESSIONS[session_id], user_id, pipeline)

    nlu, provider = nlu_service.parse(transcript, mode)
    # Use language hint from frontend (browser/Whisper), fall back to re-detection if not provided
    language = _lang_of(language_hint, transcript)
    pipeline.append(_stage("Intent Detection", "ok", f"{nlu.intent} via {provider} ({nlu.confidence:.2f})"))

    sid = session_id or str(uuid.uuid4())

    if nlu.intent == "CANCEL":
        resp = responses.cancelled(language)
        _record_history(db, user_id, transcript, nlu, language, None, "Cancelled", resp)
        return _respond(sid, "CANCELLED", nlu, language, None, [], None, None, False, resp, pipeline)

    if nlu.intent == "UNKNOWN" or (nlu.intent == "CONFIRM" and not session_id):
        resp = responses.not_understood(language)
        _record_history(db, user_id, transcript, nlu, language, None, "Failed", resp)
        return _respond(sid, "UNKNOWN", nlu, language, None, [], None, None, False, resp, pipeline)

    resolution = pr.resolve_product(db, nlu.item)
    pipeline.append(_stage("Product Matching", "ok" if resolution.status == "resolved" else "pending", resolution.status))

    if nlu.intent == "QUERY":
        return _handle_query(db, sid, transcript, nlu, language, resolution, user_id, pipeline)

    if resolution.status == "ambiguous" or (resolution.status == "not_found" and resolution.candidates):
        names = [c.product.name for c in resolution.candidates]
        cand_out = [_resolved(c.product, c.score) for c in resolution.candidates]
        resp = responses.clarify(language, names)
        _SESSIONS[sid] = PendingCommand(
            session_id=sid, intent=nlu.intent, product_id=None, product_name=None,
            quantity=nlu.quantity, unit=nlu.unit, target_stock=nlu.target_stock,
            language=language, candidates=cand_out, awaiting="clarify",
        )
        _record_history(db, user_id, transcript, nlu, language, None, "Pending", resp)
        return _respond(sid, "CLARIFY", nlu, language, None, cand_out, None, None, True, resp, pipeline)

    if resolution.status == "not_found":
        resp = responses.not_found(language)
        _record_history(db, user_id, transcript, nlu, language, None, "Failed", resp)
        return _respond(sid, "ERROR", nlu, language, None, [], None, None, False, resp, pipeline)

    return _build_confirmation(db, sid, transcript, nlu, language, resolution.product, user_id, pipeline)


def _handle_query(db, sid, transcript, nlu, language, resolution, user_id, pipeline):
    if resolution.status != "resolved" or resolution.product is None:
        resp = responses.which_to_check(language)
        cands = [_resolved(c.product, c.score) for c in resolution.candidates]
        _record_history(db, user_id, transcript, nlu, language, None, "Pending", resp)
        return _respond(sid, "CLARIFY" if cands else "ERROR", nlu, language, None, cands, None, None, False, resp, pipeline)
    p = resolution.product
    resp = responses.query_stock(language, _display_name(p, language), p.current_stock, p.base_unit)
    pipeline.append(_stage("Voice Response", "ok"))
    _record_history(db, user_id, transcript, nlu, language, p.name, "Completed", resp)
    return _respond(sid, "QUERY", nlu, language, _resolved(p), [], p.current_stock, p.base_unit, False, resp, pipeline)


def _build_confirmation(db, sid, transcript, nlu, language, product, user_id, pipeline, *, again=False):
    intent = nlu.intent
    name = _display_name(product, language)

    if intent == "CORRECT":
        if nlu.target_stock is None:
            resp = responses.ask_correct_target(language, name)
            _SESSIONS[sid] = PendingCommand(sid, intent, product.id, product.name, None, nlu.unit, None, language, awaiting="missing_qty")
            _record_history(db, user_id, transcript, nlu, language, product.name, "Pending", resp)
            return _respond(sid, "CONFIRMATION", nlu, language, _resolved(product), [], None, product.base_unit, True, resp, pipeline)
        unit = nlu.unit or product.base_unit
        resp = responses.confirm_correct(language, product.current_stock, product.base_unit, nlu.target_stock, unit, name, again=again)
        _SESSIONS[sid] = PendingCommand(sid, intent, product.id, product.name, None, unit, nlu.target_stock, language, awaiting="confirmation")
        pipeline.append(_stage("Validation", "ok"))
        pipeline.append(_stage("Confirmation", "pending"))
        _record_history(db, user_id, transcript, nlu, language, product.name, "Pending", resp)
        return _respond(sid, "CONFIRMATION", nlu, language, _resolved(product), [], nlu.target_stock, product.base_unit, True, resp, pipeline)

    # ADD / REMOVE
    if nlu.quantity is None:
        resp = responses.ask_quantity(language, name, intent)
        _SESSIONS[sid] = PendingCommand(sid, intent, product.id, product.name, None, nlu.unit, None, language, awaiting="missing_qty")
        _record_history(db, user_id, transcript, nlu, language, product.name, "Pending", resp)
        return _respond(sid, "CONFIRMATION", nlu, language, _resolved(product), [], None, product.base_unit, True, resp, pipeline)

    unit = nlu.unit or product.default_unit
    try:
        normalized = inv.normalize(product, nlu.quantity, unit)
    except inv.InventoryError as e:
        resp = e.message
        _record_history(db, user_id, transcript, nlu, language, product.name, "Failed", resp)
        return _respond(sid, "ERROR", nlu, language, _resolved(product), [], None, product.base_unit, False, resp, pipeline)

    pipeline.append(_stage("Unit Conversion", "ok", f"{nlu.quantity:g} {unit} = {normalized:g} {product.base_unit}"))
    pipeline.append(_stage("Validation", "ok"))
    pipeline.append(_stage("Confirmation", "pending"))

    if intent == "ADD":
        resp = responses.confirm_add(language, nlu.quantity, unit, name, again=again)
    else:
        resp = responses.confirm_remove(language, nlu.quantity, unit, name, again=again)
    _SESSIONS[sid] = PendingCommand(sid, intent, product.id, product.name, nlu.quantity, unit, None, language, awaiting="confirmation")
    _record_history(db, user_id, transcript, nlu, language, product.name, "Pending", resp)
    return _respond(sid, "CONFIRMATION", nlu, language, _resolved(product), [], normalized, product.base_unit, True, resp, pipeline)


def _continue(db, transcript, mode, pending: PendingCommand, user_id, pipeline):
    nlu, _ = nlu_service.parse(transcript, mode)
    sid = pending.session_id
    language = pending.language

    # Clarification: user picked a product.
    if pending.awaiting == "clarify":
        chosen = _match_choice(db, transcript, pending.candidates)
        if chosen is None:
            resp = responses.choose_product(language, [c.name for c in pending.candidates])
            return _respond(sid, "CLARIFY", nlu, language, None, pending.candidates, None, None, True, resp, pipeline)
        product = db.get(Product, chosen.id)
        merged = NLUResult(intent=pending.intent, item=chosen.name, quantity=pending.quantity, unit=pending.unit, target_stock=pending.target_stock, confidence=nlu.confidence)
        _SESSIONS.pop(sid, None)
        return _build_confirmation(db, sid, transcript, merged, language, product, user_id, pipeline)

    # Missing quantity / target answer.
    if pending.awaiting == "missing_qty":
        qty = nlu.quantity if nlu.quantity is not None else _num_only(transcript)
        if qty is None:
            resp = responses.say_a_number(language)
            return _respond(sid, "CONFIRMATION", nlu, language, _rp(pending), [], None, None, True, resp, pipeline)
        product = db.get(Product, pending.product_id)
        merged = NLUResult(
            intent=pending.intent, item=pending.product_name,
            quantity=None if pending.intent == "CORRECT" else qty,
            unit=nlu.unit or pending.unit,
            target_stock=qty if pending.intent == "CORRECT" else None,
            confidence=nlu.confidence,
        )
        _SESSIONS.pop(sid, None)
        return _build_confirmation(db, sid, transcript, merged, language, product, user_id, pipeline)

    # Awaiting confirmation: confirm / cancel / correct. A correction (new
    # quantity/unit) takes precedence over "no" so "no, 5 kilo" is a correction.
    corr_qty = nlu_service._extract_quantity(transcript)
    corr_unit = nlu_service._extract_unit(transcript)
    has_correction = corr_qty is not None or corr_unit is not None

    if nlu.intent == "CANCEL" and not has_correction:
        _SESSIONS.pop(sid, None)
        resp = responses.cancelled(language)
        _record_history(db, user_id, transcript, nlu, language, pending.product_name, "Cancelled", resp)
        return _respond(sid, "CANCELLED", nlu, language, _rp(pending), [], None, None, False, resp, pipeline)

    if nlu.intent == "CONFIRM" and not has_correction:
        return _execute(db, pending, user_id, transcript, pipeline)

    corrected = False
    if corr_qty is not None:
        if pending.intent == "CORRECT":
            pending.target_stock = corr_qty
        else:
            pending.quantity = corr_qty
        corrected = True
    if corr_unit is not None:
        pending.unit = corr_unit
        corrected = True

    if corrected:
        product = db.get(Product, pending.product_id)
        name = _display_name(product, language)
        pipeline.append(_stage("Conversational Correction", "ok"))
        if pending.intent == "CORRECT":
            unit = pending.unit or product.base_unit
            resp = responses.confirm_correct(language, product.current_stock, product.base_unit, pending.target_stock, unit, name, again=True)
        elif pending.intent == "ADD":
            resp = responses.confirm_add(language, pending.quantity, pending.unit, name, again=True)
        else:
            resp = responses.confirm_remove(language, pending.quantity, pending.unit, name, again=True)
        pending.created_at = time.time()
        _record_history(db, user_id, transcript, nlu, language, pending.product_name, "Corrected", resp)
        return _respond(sid, "CONFIRMATION", nlu, language, _rp(pending), [], None, product.base_unit, True, resp, pipeline)

    resp = responses.please_confirm(language)
    return _respond(sid, "CONFIRMATION", nlu, language, _rp(pending), [], None, None, True, resp, pipeline)


def confirm(db, session_id: str, answer: str, mode: str = "simulation", user_id: str | None = None):
    pipeline = [_stage("Voice Received", "ok", answer)]
    pending = _SESSIONS.get(session_id)
    if pending is None:
        return _respond(session_id, "ERROR", NLUResult(intent="UNKNOWN"), None, None, [], None, None, False,
                        responses.expired(None), pipeline)
    return _continue(db, answer, mode, pending, user_id, pipeline)


def cancel(db, session_id: str, user_id: str | None = None):
    pending = _SESSIONS.pop(session_id, None)
    lang = pending.language if pending else None
    name = pending.product_name if pending else None
    return _respond(session_id, "CANCELLED", NLUResult(intent="CANCEL"), lang,
                    None, [], None, None, False, responses.cancelled(lang),
                    [_stage("Cancelled", "ok", name)])


def _execute(db, pending: PendingCommand, user_id, transcript, pipeline):
    sid = pending.session_id
    language = pending.language
    product = db.get(Product, pending.product_id)
    if product is None:
        _SESSIONS.pop(sid, None)
        return _respond(sid, "ERROR", NLUResult(intent=pending.intent), language, None, [], None, None, False,
                        responses.product_gone(language), pipeline)
    try:
        if pending.intent == "ADD":
            txn = inv.add_stock(db, product, pending.quantity, pending.unit, source="VOICE", user_id=user_id)
        elif pending.intent == "REMOVE":
            txn = inv.remove_stock(db, product, pending.quantity, pending.unit, source="VOICE", user_id=user_id)
        else:
            txn = inv.correct_stock(db, product, pending.target_stock, pending.unit, source="VOICE", user_id=user_id)
    except inv.InventoryError as e:
        _SESSIONS.pop(sid, None)
        if e.code == "INSUFFICIENT_STOCK":
            msg = responses.insufficient(language, _display_name(product, language), product.current_stock, product.base_unit)
        else:
            msg = e.message
        _record_history(db, user_id, transcript, NLUResult(intent=pending.intent), language, product.name, "Failed", msg)
        return _respond(sid, "ERROR", NLUResult(intent=pending.intent), language, _rp(pending), [], None, product.base_unit, False, msg, pipeline)

    _SESSIONS.pop(sid, None)
    name = _display_name(product, language)
    pipeline.append(_stage("Inventory Update", "ok", f"stock -> {product.current_stock:g} {product.base_unit}"))
    pipeline.append(_stage("Voice Response", "ok"))

    if pending.intent == "ADD":
        resp = responses.executed_add(language, pending.quantity, pending.unit, name, product.current_stock, product.base_unit)
    elif pending.intent == "REMOVE":
        resp = responses.executed_remove(language, pending.quantity, pending.unit, name, product.current_stock, product.base_unit)
    else:
        resp = responses.executed_correct(language, name, product.current_stock, product.base_unit)

    _record_history(db, user_id, transcript, NLUResult(intent=pending.intent, quantity=pending.quantity, unit=pending.unit), language, product.name, "Completed", resp)
    return _respond(sid, "EXECUTED", NLUResult(intent=pending.intent), language, _resolved(product),
                    [], txn.normalized_quantity, product.base_unit, False, resp, pipeline)


def _match_choice(db, transcript: str, candidates: list[ResolvedProduct]) -> ResolvedProduct | None:
    low = transcript.lower()
    for c in candidates:
        if c.name.lower() in low or c.name.split(" ")[0].lower() in low:
            return c
    best, best_score = None, 0.0
    for c in candidates:
        score = pr._ratio(low, c.name.lower())
        if score > best_score:
            best, best_score = c, score
    return best if best_score >= pr.STRONG_MATCH else None


def _num_only(text: str) -> float | None:
    import re

    m = re.search(r"(\d+(?:\.\d+)?)", text)
    return float(m.group(1)) if m else None


def _rp(pending: PendingCommand) -> ResolvedProduct | None:
    if pending.product_id and pending.product_name:
        return ResolvedProduct(id=pending.product_id, name=pending.product_name, score=100.0)
    return None


def _respond(sid, state, nlu, language, product, candidates, normalized_qty, base_unit,
             requires_confirmation, response_text, pipeline) -> VoiceProcessResponse:
    tts = tts_service.synthesize(response_text, language)
    return VoiceProcessResponse(
        session_id=sid,
        state=state,
        intent=nlu.intent,
        nlu=nlu,
        language=language,
        product=product,
        candidates=candidates,
        normalized_quantity=normalized_qty,
        base_unit=base_unit,
        requires_confirmation=requires_confirmation,
        response_text=response_text,
        tts=tts,
        pipeline=pipeline,
    )
