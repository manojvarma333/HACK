"""Manual inventory operations (PRD 37) + read endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.products import to_out
from app.database import get_db
from app.models import Product, User
from app.schemas import (
    ProductOut,
    StockCorrectRequest,
    StockOpRequest,
    TransactionOut,
)
from app.security import get_optional_user
from app.services import inventory_service as inv

router = APIRouter(prefix="/api/inventory", tags=["inventory"])


@router.get("", response_model=list[ProductOut])
def inventory(db: Session = Depends(get_db)):
    return [to_out(p) for p in db.query(Product).all()]


@router.get("/{product_id}", response_model=ProductOut)
def inventory_item(product_id: str, db: Session = Depends(get_db)):
    product = db.get(Product, product_id)
    if product is None:
        raise HTTPException(status_code=404, detail="Product not found")
    return to_out(product)


def _get(db: Session, product_id: str) -> Product:
    product = db.get(Product, product_id)
    if product is None:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


@router.post("/add", response_model=TransactionOut)
def add(req: StockOpRequest, db: Session = Depends(get_db), user: User | None = Depends(get_optional_user)):
    product = _get(db, req.product_id)
    try:
        return inv.add_stock(db, product, req.quantity, req.unit, req.reason, req.source, user.id if user else None)
    except inv.InventoryError as e:
        raise HTTPException(status_code=400, detail={"code": e.code, "message": e.message})


@router.post("/remove", response_model=TransactionOut)
def remove(req: StockOpRequest, db: Session = Depends(get_db), user: User | None = Depends(get_optional_user)):
    product = _get(db, req.product_id)
    try:
        return inv.remove_stock(db, product, req.quantity, req.unit, req.reason, req.source, user.id if user else None)
    except inv.InventoryError as e:
        raise HTTPException(status_code=400, detail={"code": e.code, "message": e.message})


@router.post("/correct", response_model=TransactionOut)
def correct(req: StockCorrectRequest, db: Session = Depends(get_db), user: User | None = Depends(get_optional_user)):
    product = _get(db, req.product_id)
    try:
        return inv.correct_stock(db, product, req.target_stock, req.unit, req.reason, req.source, user.id if user else None)
    except inv.InventoryError as e:
        raise HTTPException(status_code=400, detail={"code": e.code, "message": e.message})
