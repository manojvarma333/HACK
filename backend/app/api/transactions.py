"""Transaction history (PRD 38-39)."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Transaction
from app.schemas import TransactionOut

router = APIRouter(prefix="/api/transactions", tags=["transactions"])


@router.get("", response_model=list[TransactionOut])
def list_transactions(
    product_id: str | None = None,
    action: str | None = None,
    source: str | None = None,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    query = db.query(Transaction)
    if product_id:
        query = query.filter(Transaction.product_id == product_id)
    if action:
        query = query.filter(Transaction.action == action)
    if source:
        query = query.filter(Transaction.source == source)
    return query.order_by(Transaction.created_at.desc()).limit(min(limit, 500)).all()


@router.get("/{txn_id}", response_model=TransactionOut)
def get_transaction(txn_id: str, db: Session = Depends(get_db)):
    txn = db.get(Transaction, txn_id)
    if txn is None:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return txn
