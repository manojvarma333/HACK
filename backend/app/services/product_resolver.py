"""Product resolution (PRD 26-28).

Resolution order:
  1. Exact product name
  2. Exact alias
  3. Normalized alias
  4. Fuzzy matching (RapidFuzz)
  5. (LLM-assisted handled upstream by NLU 'item')
  6. Ask user (ambiguous / no confident match)

Never silently pick between multiple highly similar products.
"""

from __future__ import annotations

from dataclasses import dataclass

from sqlalchemy.orm import Session

from app.models import Alias, Product

try:
    from rapidfuzz import fuzz, process

    _HAS_RAPIDFUZZ = True
except Exception:  # pragma: no cover - fallback if not installed
    _HAS_RAPIDFUZZ = False


# Score thresholds (0-100).
STRONG_MATCH = 82
AMBIGUOUS_DELTA = 6  # if top two are within this, treat as ambiguous


@dataclass
class Candidate:
    product: Product
    score: float


def _normalize(text: str) -> str:
    return " ".join(text.strip().lower().split())


def _ratio(a: str, b: str) -> float:
    if _HAS_RAPIDFUZZ:
        return float(fuzz.token_set_ratio(a, b))
    # Simple fallback: containment / equality scoring.
    a, b = _normalize(a), _normalize(b)
    if a == b:
        return 100.0
    if a in b or b in a:
        return 88.0
    common = set(a.split()) & set(b.split())
    if common:
        return 70.0
    return 0.0


def _build_index(db: Session) -> list[tuple[str, Product]]:
    """Return list of (searchable_text, product) for names + aliases."""
    products = db.query(Product).all()
    index: list[tuple[str, Product]] = []
    for p in products:
        index.append((_normalize(p.name), p))
        if p.name_local:
            index.append((_normalize(p.name_local), p))
        first = p.name.split(" ")[0]
        if first:
            index.append((_normalize(first), p))
    aliases = db.query(Alias).all()
    for a in aliases:
        if a.product is not None:
            index.append((_normalize(a.alias), a.product))
    return index


@dataclass
class Resolution:
    status: str  # "resolved" | "ambiguous" | "not_found"
    product: Product | None
    candidates: list[Candidate]


def resolve_product(db: Session, term: str | None) -> Resolution:
    """Resolve a spoken product term to a single Product, or flag ambiguity."""
    if not term or not term.strip():
        return Resolution("not_found", None, [])

    query = _normalize(term)
    index = _build_index(db)
    if not index:
        return Resolution("not_found", None, [])

    # 1-3: exact / normalized match on name or alias.
    exact = {pid: p for text, p in index if text == query for pid in [p.id]}
    if len(exact) == 1:
        p = next(iter(exact.values()))
        return Resolution("resolved", p, [Candidate(p, 100.0)])
    if len(exact) > 1:
        cands = [Candidate(p, 100.0) for p in exact.values()]
        return Resolution("ambiguous", None, cands)

    # 4: fuzzy. Score best text per product, keep the highest per product.
    best_per_product: dict[str, Candidate] = {}
    for text, p in index:
        score = _ratio(query, text)
        cur = best_per_product.get(p.id)
        if cur is None or score > cur.score:
            best_per_product[p.id] = Candidate(p, score)

    ranked = sorted(best_per_product.values(), key=lambda c: c.score, reverse=True)
    ranked = [c for c in ranked if c.score > 0]
    if not ranked:
        return Resolution("not_found", None, [])

    top = ranked[0]
    if top.score < STRONG_MATCH:
        # Not confident enough -> return candidates for clarification.
        return Resolution("not_found", None, ranked[:3])

    if len(ranked) > 1 and (top.score - ranked[1].score) <= AMBIGUOUS_DELTA:
        # Two products are nearly equally likely -> ask the user.
        near = [c for c in ranked if (top.score - c.score) <= AMBIGUOUS_DELTA]
        return Resolution("ambiguous", None, near[:3])

    return Resolution("resolved", top.product, ranked[:3])
