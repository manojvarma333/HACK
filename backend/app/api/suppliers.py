"""Suppliers + purchase orders API.

Combines supplier directory and purchase ordering so the shopkeeper can order
products from a supplier on a single screen. Purchase orders are recorded but do
not mutate inventory until goods are received (status = "received").
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Product, Purchase, PurchaseItem, Supplier
from app.schemas import PurchaseCreate, PurchaseOut, SupplierOut

router = APIRouter(tags=["suppliers"])


def _purchase_out(purchase: Purchase) -> PurchaseOut:
    out = PurchaseOut.model_validate(purchase)
    out.supplier_name = purchase.supplier.name if purchase.supplier else None
    return out


@router.get("/api/suppliers", response_model=list[SupplierOut])
def list_suppliers(db: Session = Depends(get_db)):
    return db.query(Supplier).order_by(Supplier.name).all()


@router.get("/api/suppliers/{supplier_id}", response_model=SupplierOut)
def get_supplier(supplier_id: str, db: Session = Depends(get_db)):
    supplier = db.get(Supplier, supplier_id)
    if supplier is None:
        raise HTTPException(status_code=404, detail="Supplier not found")
    return supplier


@router.get("/api/purchases", response_model=list[PurchaseOut])
def list_purchases(limit: int = 100, db: Session = Depends(get_db)):
    purchases = (
        db.query(Purchase)
        .order_by(Purchase.created_at.desc())
        .limit(min(limit, 500))
        .all()
    )
    return [_purchase_out(p) for p in purchases]


@router.post("/api/purchases", response_model=PurchaseOut, status_code=201)
def create_purchase(payload: PurchaseCreate, db: Session = Depends(get_db)):
    supplier = db.get(Supplier, payload.supplier_id)
    if supplier is None:
        raise HTTPException(status_code=404, detail="Supplier not found")

    total = 0.0
    purchase = Purchase(
        supplier_id=supplier.id, status=payload.status, notes=payload.notes, total=0.0
    )
    db.add(purchase)
    db.flush()

    for item in payload.items:
        product = db.get(Product, item.product_id)
        if product is None:
            raise HTTPException(
                status_code=404, detail=f"Product not found: {item.product_id}"
            )
        line_total = item.quantity * item.purchase_price
        total += line_total
        db.add(
            PurchaseItem(
                purchase_id=purchase.id,
                product_id=product.id,
                quantity=item.quantity,
                unit=item.unit,
                purchase_price=item.purchase_price,
            )
        )

    purchase.total = round(total, 2)
    db.commit()
    db.refresh(purchase)
    return _purchase_out(purchase)
