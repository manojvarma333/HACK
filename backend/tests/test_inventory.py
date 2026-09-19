"""Inventory business-logic tests (PRD 23-25, 68)."""

import pytest

from app.models import Product
from app.services import inventory_service as inv


def _rice(db) -> Product:
    return db.query(Product).filter(Product.name == "Sona Masoori Rice").first()


def _sugar(db) -> Product:
    return db.query(Product).filter(Product.name == "Sugar").first()


def test_add_stock_updates_and_records(db):
    rice = _rice(db)
    start = rice.current_stock
    txn = inv.add_stock(db, rice, 5, "kg", source="MANUAL")
    assert rice.current_stock == start + 5
    assert txn.action == "ADD"
    assert txn.normalized_quantity == 5
    assert txn.stock_after == start + 5


def test_add_with_product_specific_bag_unit(db):
    rice = _rice(db)
    start = rice.current_stock
    inv.add_stock(db, rice, 2, "bag", source="MANUAL")  # 1 bag = 50 kg
    assert rice.current_stock == start + 100


def test_remove_respects_negative_protection(db):
    sugar = _sugar(db)
    with pytest.raises(inv.InventoryError) as e:
        inv.remove_stock(db, sugar, sugar.current_stock + 10, "kg")
    assert e.value.code == "INSUFFICIENT_STOCK"


def test_correct_stock_sets_absolute(db):
    rice = _rice(db)
    inv.correct_stock(db, rice, 80, "kg", source="MANUAL")
    assert rice.current_stock == 80


def test_status_and_alert_generation(db):
    sugar = _sugar(db)  # seeded below min_stock -> low/critical
    status = inv.status_for(sugar)
    assert status in {"low", "critical", "out-of-stock"}
