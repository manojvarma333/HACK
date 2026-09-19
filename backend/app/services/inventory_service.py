"""Inventory business logic (PRD 23-25, 51).

ALL inventory mutations go through here. Operations are atomic: validate ->
convert unit -> mutate stock -> write transaction -> recompute alerts -> commit.
The LLM never calls the DB; it only produces the structured intent that these
functions validate and apply.
"""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.models import Alert, Product, Transaction
from app.services import unit_converter as uc


class InventoryError(Exception):
    def __init__(self, code: str, message: str):
        self.code = code
        self.message = message
        super().__init__(message)


def _product_unit_map(product: Product) -> dict[str, float]:
    return {pu.unit.lower(): pu.factor_to_base for pu in product.product_units}


def normalize(product: Product, quantity: float, unit: str | None) -> float:
    try:
        return uc.convert_to_base(
            quantity, unit, product.base_unit, _product_unit_map(product)
        )
    except uc.UnitError as e:
        raise InventoryError("UNIT_ERROR", str(e)) from e


def status_for(product: Product) -> str:
    if product.current_stock <= 0:
        return "out-of-stock"
    if product.critical_stock and product.current_stock <= product.critical_stock:
        return "critical"
    if product.min_stock and product.current_stock <= product.min_stock:
        return "low"
    return "healthy"


def days_of_cover(product: Product) -> float | None:
    if product.avg_daily_usage and product.avg_daily_usage > 0:
        return round(product.current_stock / product.avg_daily_usage, 1)
    return None


def _recompute_alerts(db: Session, product: Product) -> None:
    """Ensure at most one open alert per product, matching current status."""
    status = status_for(product)
    open_alerts = (
        db.query(Alert)
        .filter(Alert.product_id == product.id, Alert.resolved.is_(False))
        .all()
    )
    if status in ("healthy",):
        for a in open_alerts:
            a.resolved = True
        return

    for a in open_alerts:
        a.resolved = True

    sev = {"out-of-stock": "critical", "critical": "critical", "low": "warning"}[status]
    msg = {
        "out-of-stock": f"{product.name} is out of stock.",
        "critical": f"{product.name} is critically low. Only {product.current_stock:g} {product.base_unit} left.",
        "low": f"{product.name} is low. Only {product.current_stock:g} {product.base_unit} remaining.",
    }[status]
    db.add(
        Alert(
            product_id=product.id,
            product_name=product.name,
            type="out-of-stock" if status == "out-of-stock" else "low-stock",
            severity=sev,
            message=msg,
            resolved=False,
        )
    )


def _apply(
    db: Session,
    product: Product,
    action: str,
    original_qty: float,
    original_unit: str | None,
    normalized_qty: float,
    new_stock: float,
    reason: str | None,
    source: str,
    user_id: str | None,
) -> Transaction:
    product.current_stock = new_stock
    txn = Transaction(
        product_id=product.id,
        user_id=user_id,
        action=action,
        quantity=original_qty,
        unit=original_unit or product.base_unit,
        normalized_quantity=normalized_qty,
        stock_after=new_stock,
        reason=reason,
        source=source,
    )
    db.add(txn)
    _recompute_alerts(db, product)
    return txn


def add_stock(
    db: Session,
    product: Product,
    quantity: float,
    unit: str | None,
    reason: str | None = None,
    source: str = "MANUAL",
    user_id: str | None = None,
) -> Transaction:
    if quantity <= 0:
        raise InventoryError("INVALID_QUANTITY", "Quantity must be greater than zero.")
    normalized = normalize(product, quantity, unit)
    new_stock = round(product.current_stock + normalized, 4)
    try:
        txn = _apply(db, product, "ADD", quantity, unit, normalized, new_stock,
                     reason, source, user_id)
        db.commit()
        db.refresh(txn)
        return txn
    except Exception:
        db.rollback()
        raise


def remove_stock(
    db: Session,
    product: Product,
    quantity: float,
    unit: str | None,
    reason: str | None = None,
    source: str = "MANUAL",
    user_id: str | None = None,
) -> Transaction:
    if quantity <= 0:
        raise InventoryError("INVALID_QUANTITY", "Quantity must be greater than zero.")
    normalized = normalize(product, quantity, unit)
    new_stock = round(product.current_stock - normalized, 4)
    if new_stock < 0 and not product.allow_negative:
        raise InventoryError(
            "INSUFFICIENT_STOCK",
            f"Only {product.current_stock:g} {product.base_unit} of {product.name} are currently available.",
        )
    try:
        txn = _apply(db, product, "REMOVE", quantity, unit, normalized, new_stock,
                     reason, source, user_id)
        db.commit()
        db.refresh(txn)
        return txn
    except Exception:
        db.rollback()
        raise


def correct_stock(
    db: Session,
    product: Product,
    target_stock: float,
    unit: str | None,
    reason: str | None = None,
    source: str = "MANUAL",
    user_id: str | None = None,
) -> Transaction:
    if target_stock < 0:
        raise InventoryError("INVALID_QUANTITY", "Target stock cannot be negative.")
    normalized_target = normalize(product, target_stock, unit)
    delta = round(normalized_target - product.current_stock, 4)
    try:
        txn = _apply(
            db, product, "CORRECTION", target_stock, unit, delta,
            round(normalized_target, 4),
            reason or f"Corrected to {target_stock:g} {unit or product.base_unit}",
            source, user_id,
        )
        db.commit()
        db.refresh(txn)
        return txn
    except Exception:
        db.rollback()
        raise
