"""Unit normalization and conversion (PRD 30-32).

Every quantity is normalized to a product's `base_unit`. Global unit families
handle standard conversions; product-specific units (e.g. 1 bag = 50 kg) are
supplied via `product_units` and take precedence.
"""

from __future__ import annotations

# Canonical base unit per measurement family and factors TO that base.
_WEIGHT_BASE = "kg"
_VOLUME_BASE = "litre"
_COUNT_BASE = "piece"

_GLOBAL_FACTORS: dict[str, tuple[str, float]] = {
    # weight -> kg
    "gram": (_WEIGHT_BASE, 0.001),
    "g": (_WEIGHT_BASE, 0.001),
    "gm": (_WEIGHT_BASE, 0.001),
    "kg": (_WEIGHT_BASE, 1.0),
    "kilo": (_WEIGHT_BASE, 1.0),
    "kilogram": (_WEIGHT_BASE, 1.0),
    "quintal": (_WEIGHT_BASE, 100.0),
    # volume -> litre
    "ml": (_VOLUME_BASE, 0.001),
    "millilitre": (_VOLUME_BASE, 0.001),
    "litre": (_VOLUME_BASE, 1.0),
    "liter": (_VOLUME_BASE, 1.0),
    "l": (_VOLUME_BASE, 1.0),
    # count -> piece
    "piece": (_COUNT_BASE, 1.0),
    "pcs": (_COUNT_BASE, 1.0),
    "pc": (_COUNT_BASE, 1.0),
    "dozen": (_COUNT_BASE, 12.0),
    "packet": (_COUNT_BASE, 1.0),
    "pack": (_COUNT_BASE, 1.0),
    "box": (_COUNT_BASE, 1.0),
    "carton": (_COUNT_BASE, 1.0),
    "bag": (_WEIGHT_BASE, 1.0),  # overridden per-product when defined
}

# Common spoken/localized aliases -> canonical unit token.
_UNIT_ALIASES: dict[str, str] = {
    "kgs": "kg",
    "kilos": "kg",
    "kilograms": "kg",
    "grams": "gram",
    "litres": "litre",
    "liters": "litre",
    "pieces": "piece",
    "packets": "packet",
    "packets.": "packet",
    "boxes": "box",
    "cartons": "carton",
    "bags": "bag",
    "dozens": "dozen",
    "kilo": "kg",
}


class UnitError(ValueError):
    """Raised when a unit cannot be resolved to a product's base unit."""


def normalize_unit_token(unit: str | None) -> str | None:
    if not unit:
        return None
    u = unit.strip().lower()
    return _UNIT_ALIASES.get(u, u)


def _family_and_factor(unit: str) -> tuple[str, float] | None:
    return _GLOBAL_FACTORS.get(unit)


def convert_to_base(
    quantity: float,
    unit: str | None,
    base_unit: str,
    product_units: dict[str, float] | None = None,
) -> float:
    """Convert `quantity` of `unit` into `base_unit`.

    `product_units` maps a unit token -> factor_to_base for product-specific
    conversions (e.g. {"bag": 50.0}). Raises UnitError on incompatible units.
    """
    product_units = product_units or {}
    u = normalize_unit_token(unit)
    base = normalize_unit_token(base_unit) or base_unit

    # No unit provided -> assume already in base unit.
    if u is None:
        return float(quantity)

    # Product-specific conversion wins.
    if u in product_units:
        return float(quantity) * float(product_units[u])

    if u == base:
        return float(quantity)

    src = _family_and_factor(u)
    dst = _family_and_factor(base)
    if src is None or dst is None:
        raise UnitError(f"Unknown unit '{unit}' for base '{base_unit}'.")

    src_family, src_factor = src
    dst_family, dst_factor = dst
    if src_family != dst_family:
        raise UnitError(
            f"Cannot convert '{unit}' to '{base_unit}' (different measurement types)."
        )
    # quantity -> family base -> target base
    return float(quantity) * src_factor / dst_factor


def known_units() -> list[str]:
    return sorted(set(_GLOBAL_FACTORS) | set(_UNIT_ALIASES))
