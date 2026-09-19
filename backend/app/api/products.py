"""Product CRUD + serialization helpers (PRD 33-35)."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Alias, Product
from app.schemas import ProductCreate, ProductOut, ProductUpdate
from app.services import inventory_service as inv

router = APIRouter(prefix="/api/products", tags=["products"])


def to_out(product: Product) -> ProductOut:
    out = ProductOut.model_validate(product)
    out.status = inv.status_for(product)
    out.stock_value = round(product.current_stock * product.purchase_price, 2)
    out.days_of_cover = inv.days_of_cover(product)
    return out


@router.get("", response_model=list[ProductOut])
def list_products(
    search: str | None = None,
    category: str | None = None,
    status: str | None = None,
    db: Session = Depends(get_db),
):
    query = db.query(Product)
    if category:
        query = query.filter(Product.category == category)
    products = query.all()
    if search:
        s = search.lower()
        products = [
            p for p in products
            if s in p.name.lower()
            or (p.name_local and s in p.name_local.lower())
            or (p.sku and s in p.sku.lower())
            or any(s in a.alias.lower() for a in p.aliases)
        ]
    result = [to_out(p) for p in products]
    if status:
        result = [p for p in result if p.status == status]
    return result


@router.post("", response_model=ProductOut, status_code=201)
def create_product(payload: ProductCreate, db: Session = Depends(get_db)):
    product = Product(
        name=payload.name,
        name_local=payload.name_local,
        category=payload.category,
        brand=payload.brand,
        sku=payload.sku,
        base_unit=payload.base_unit,
        default_unit=payload.default_unit,
        current_stock=payload.opening_stock,
        opening_stock=payload.opening_stock,
        purchase_price=payload.purchase_price,
        selling_price=payload.selling_price,
        min_stock=payload.min_stock,
        critical_stock=payload.critical_stock,
        reorder_quantity=payload.reorder_quantity,
        avg_daily_usage=payload.avg_daily_usage,
        allow_negative=payload.allow_negative,
    )
    db.add(product)
    db.flush()
    for alias in payload.aliases:
        if alias.strip():
            db.add(Alias(product_id=product.id, alias=alias.strip()))
    db.commit()
    db.refresh(product)
    return to_out(product)


@router.get("/{product_id}", response_model=ProductOut)
def get_product(product_id: str, db: Session = Depends(get_db)):
    product = db.get(Product, product_id)
    if product is None:
        raise HTTPException(status_code=404, detail="Product not found")
    return to_out(product)


@router.put("/{product_id}", response_model=ProductOut)
def update_product(product_id: str, payload: ProductUpdate, db: Session = Depends(get_db)):
    product = db.get(Product, product_id)
    if product is None:
        raise HTTPException(status_code=404, detail="Product not found")
    data = payload.model_dump(exclude_unset=True)
    for key, value in data.items():
        setattr(product, key, value)
    db.commit()
    db.refresh(product)
    return to_out(product)


@router.delete("/{product_id}", status_code=204)
def delete_product(product_id: str, db: Session = Depends(get_db)):
    product = db.get(Product, product_id)
    if product is None:
        raise HTTPException(status_code=404, detail="Product not found")
    db.delete(product)
    db.commit()
