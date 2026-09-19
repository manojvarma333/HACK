"""SQLAlchemy ORM models for VoiceStock AI.

Schema mirrors PRD sections 49-51. Inventory current_stock is stored on the
Product row for fast reads; every change is also recorded as a Transaction so
the ledger is the source of truth for analytics.
"""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


def _uuid() -> str:
    return str(uuid.uuid4())


def _now() -> datetime:
    return datetime.utcnow()


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    name: Mapped[str] = mapped_column(String, nullable=False)
    email: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String, nullable=False)
    shop_name: Mapped[str] = mapped_column(String, nullable=False)
    role: Mapped[str] = mapped_column(String, default="owner")  # owner | staff
    reset_token_hash: Mapped[str | None] = mapped_column(String, nullable=True)
    reset_token_expires: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)

    transactions: Mapped[list["Transaction"]] = relationship(back_populates="user")


class Product(Base):
    __tablename__ = "products"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    name: Mapped[str] = mapped_column(String, nullable=False, index=True)
    name_local: Mapped[str | None] = mapped_column(String, nullable=True)
    category: Mapped[str] = mapped_column(String, default="General")
    brand: Mapped[str | None] = mapped_column(String, nullable=True)
    sku: Mapped[str | None] = mapped_column(String, nullable=True, index=True)

    base_unit: Mapped[str] = mapped_column(String, default="kg")  # canonical unit
    default_unit: Mapped[str] = mapped_column(String, default="kg")

    current_stock: Mapped[float] = mapped_column(Float, default=0.0)  # in base_unit
    opening_stock: Mapped[float] = mapped_column(Float, default=0.0)

    purchase_price: Mapped[float] = mapped_column(Float, default=0.0)
    selling_price: Mapped[float] = mapped_column(Float, default=0.0)

    min_stock: Mapped[float] = mapped_column(Float, default=0.0)
    critical_stock: Mapped[float] = mapped_column(Float, default=0.0)
    reorder_quantity: Mapped[float] = mapped_column(Float, default=0.0)
    avg_daily_usage: Mapped[float] = mapped_column(Float, default=0.0)

    allow_negative: Mapped[bool] = mapped_column(Boolean, default=False)
    supplier_id: Mapped[str | None] = mapped_column(
        ForeignKey("suppliers.id"), nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=_now, onupdate=_now
    )

    aliases: Mapped[list["Alias"]] = relationship(
        back_populates="product", cascade="all, delete-orphan"
    )
    product_units: Mapped[list["ProductUnit"]] = relationship(
        back_populates="product", cascade="all, delete-orphan"
    )
    transactions: Mapped[list["Transaction"]] = relationship(
        back_populates="product"
    )
    supplier: Mapped["Supplier | None"] = relationship(back_populates="products")


class Alias(Base):
    __tablename__ = "aliases"
    __table_args__ = (UniqueConstraint("product_id", "alias", name="uq_product_alias"),)

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    product_id: Mapped[str] = mapped_column(ForeignKey("products.id"), index=True)
    alias: Mapped[str] = mapped_column(String, nullable=False, index=True)
    lang: Mapped[str | None] = mapped_column(String, nullable=True)  # en|hi|te

    product: Mapped["Product"] = relationship(back_populates="aliases")


class ProductUnit(Base):
    """Product-specific unit conversion, e.g. 1 bag = 50 kg (base_unit)."""

    __tablename__ = "product_units"
    __table_args__ = (UniqueConstraint("product_id", "unit", name="uq_product_unit"),)

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    product_id: Mapped[str] = mapped_column(ForeignKey("products.id"), index=True)
    unit: Mapped[str] = mapped_column(String, nullable=False)  # e.g. "bag"
    factor_to_base: Mapped[float] = mapped_column(Float, nullable=False)  # e.g. 50.0

    product: Mapped["Product"] = relationship(back_populates="product_units")


class Transaction(Base):
    __tablename__ = "transactions"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    product_id: Mapped[str] = mapped_column(ForeignKey("products.id"), index=True)
    user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)

    action: Mapped[str] = mapped_column(String, nullable=False)  # ADD|REMOVE|CORRECTION
    quantity: Mapped[float] = mapped_column(Float, nullable=False)  # original qty
    unit: Mapped[str] = mapped_column(String, nullable=False)  # original unit
    normalized_quantity: Mapped[float] = mapped_column(Float, nullable=False)  # base
    stock_after: Mapped[float] = mapped_column(Float, nullable=False)

    reason: Mapped[str | None] = mapped_column(String, nullable=True)
    source: Mapped[str] = mapped_column(String, default="MANUAL")  # VOICE|MANUAL|SYSTEM
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now, index=True)

    product: Mapped["Product"] = relationship(back_populates="transactions")
    user: Mapped["User | None"] = relationship(back_populates="transactions")


class VoiceHistory(Base):
    __tablename__ = "voice_history"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    transcript: Mapped[str] = mapped_column(Text, default="")
    language: Mapped[str | None] = mapped_column(String, nullable=True)
    intent: Mapped[str | None] = mapped_column(String, nullable=True)
    product_id: Mapped[str | None] = mapped_column(String, nullable=True)
    product_name: Mapped[str | None] = mapped_column(String, nullable=True)
    quantity: Mapped[float | None] = mapped_column(Float, nullable=True)
    unit: Mapped[str | None] = mapped_column(String, nullable=True)
    confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    status: Mapped[str] = mapped_column(String, default="Pending")
    response: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now, index=True)


class Alert(Base):
    __tablename__ = "alerts"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    product_id: Mapped[str | None] = mapped_column(String, nullable=True)
    product_name: Mapped[str | None] = mapped_column(String, nullable=True)
    type: Mapped[str] = mapped_column(String, default="low-stock")
    severity: Mapped[str] = mapped_column(String, default="warning")
    message: Mapped[str] = mapped_column(String, default="")
    resolved: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now, index=True)


class Supplier(Base):
    __tablename__ = "suppliers"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    name: Mapped[str] = mapped_column(String, nullable=False)
    phone: Mapped[str | None] = mapped_column(String, nullable=True)
    email: Mapped[str | None] = mapped_column(String, nullable=True)
    address: Mapped[str | None] = mapped_column(String, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)

    products: Mapped[list["Product"]] = relationship(back_populates="supplier")
    purchases: Mapped[list["Purchase"]] = relationship(back_populates="supplier")


class Purchase(Base):
    __tablename__ = "purchases"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    supplier_id: Mapped[str | None] = mapped_column(
        ForeignKey("suppliers.id"), nullable=True
    )
    total: Mapped[float] = mapped_column(Float, default=0.0)
    status: Mapped[str] = mapped_column(String, default="received")
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now, index=True)

    supplier: Mapped["Supplier | None"] = relationship(back_populates="purchases")
    items: Mapped[list["PurchaseItem"]] = relationship(
        back_populates="purchase", cascade="all, delete-orphan"
    )


class PurchaseItem(Base):
    __tablename__ = "purchase_items"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    purchase_id: Mapped[str] = mapped_column(ForeignKey("purchases.id"), index=True)
    product_id: Mapped[str] = mapped_column(ForeignKey("products.id"))
    quantity: Mapped[float] = mapped_column(Float, default=0.0)
    unit: Mapped[str] = mapped_column(String, default="kg")
    purchase_price: Mapped[float] = mapped_column(Float, default=0.0)

    purchase: Mapped["Purchase"] = relationship(back_populates="items")


class Setting(Base):
    __tablename__ = "settings"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    key: Mapped[str] = mapped_column(String, index=True)
    value: Mapped[str | None] = mapped_column(Text, nullable=True)
