"""Pydantic schemas (request/response models)."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# ----------------------------- Auth -----------------------------
class RegisterRequest(BaseModel):
    name: str = Field(min_length=1)
    email: EmailStr
    password: str = Field(min_length=6)
    confirm_password: str
    shop_name: str = Field(min_length=1)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(min_length=6)


class UserOut(ORMModel):
    id: str
    name: str
    email: EmailStr
    shop_name: str
    role: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# --------------------------- Products ---------------------------
class AliasOut(ORMModel):
    id: str
    alias: str
    lang: str | None = None


class ProductUnitOut(ORMModel):
    id: str
    unit: str
    factor_to_base: float


class ProductBase(BaseModel):
    name: str
    name_local: str | None = None
    category: str = "General"
    brand: str | None = None
    sku: str | None = None
    base_unit: str = "kg"
    default_unit: str = "kg"
    purchase_price: float = 0.0
    selling_price: float = 0.0
    min_stock: float = 0.0
    critical_stock: float = 0.0
    reorder_quantity: float = 0.0
    avg_daily_usage: float = 0.0
    allow_negative: bool = False


class ProductCreate(ProductBase):
    opening_stock: float = 0.0
    aliases: list[str] = []


class ProductUpdate(BaseModel):
    name: str | None = None
    name_local: str | None = None
    category: str | None = None
    brand: str | None = None
    sku: str | None = None
    default_unit: str | None = None
    purchase_price: float | None = None
    selling_price: float | None = None
    min_stock: float | None = None
    critical_stock: float | None = None
    reorder_quantity: float | None = None
    avg_daily_usage: float | None = None
    allow_negative: bool | None = None


class ProductOut(ORMModel):
    id: str
    name: str
    name_local: str | None
    category: str
    brand: str | None
    sku: str | None
    base_unit: str
    default_unit: str
    current_stock: float
    min_stock: float
    critical_stock: float
    purchase_price: float
    selling_price: float
    avg_daily_usage: float
    allow_negative: bool
    status: str = "healthy"
    stock_value: float = 0.0
    days_of_cover: float | None = None
    aliases: list[AliasOut] = []
    product_units: list[ProductUnitOut] = []
    updated_at: datetime


# --------------------------- Inventory ---------------------------
class StockOpRequest(BaseModel):
    product_id: str
    quantity: float = Field(gt=0)
    unit: str | None = None
    reason: str | None = None
    source: str = "MANUAL"


class StockCorrectRequest(BaseModel):
    product_id: str
    target_stock: float = Field(ge=0)
    unit: str | None = None
    reason: str | None = None
    source: str = "MANUAL"


# ------------------------- Transactions --------------------------
class TransactionOut(ORMModel):
    id: str
    product_id: str
    action: str
    quantity: float
    unit: str
    normalized_quantity: float
    stock_after: float
    reason: str | None
    source: str
    created_at: datetime


# ---------------------------- Voice ------------------------------
class TranscribeResponse(BaseModel):
    transcript: str
    language: str | None = None
    backend: str  # "whisper" | "simulation"


class NLUResult(BaseModel):
    intent: str
    item: str | None = None
    quantity: float | None = None
    unit: str | None = None
    target_stock: float | None = None
    reason: str | None = None
    confidence: float = 0.0


class ProcessRequest(BaseModel):
    transcript: str
    mode: str = "simulation"  # simulation | real
    session_id: str | None = None
    language: str | None = None  # Hint from frontend (e.g., 'te-IN', 'hi-IN')


class ResolvedProduct(BaseModel):
    id: str
    name: str
    score: float


class VoiceProcessResponse(BaseModel):
    session_id: str
    state: str  # CONFIRMATION | CLARIFY | QUERY | EXECUTED | ERROR | UNKNOWN
    intent: str
    nlu: NLUResult
    language: str | None = None
    product: ResolvedProduct | None = None
    candidates: list[ResolvedProduct] = []
    normalized_quantity: float | None = None
    base_unit: str | None = None
    requires_confirmation: bool = False
    response_text: str
    tts: "TTSResult | None" = None
    pipeline: list["PipelineStage"] = []


class ConfirmRequest(BaseModel):
    session_id: str
    answer: str = "yes"  # free-form: yes/no/correction text
    mode: str = "simulation"


class TTSResult(BaseModel):
    text: str
    lang: str
    provider: str  # "browser" | "server"
    audio_base64: str | None = None


class PipelineStage(BaseModel):
    stage: str
    status: str  # ok | skipped | error | pending
    detail: str | None = None
    duration_ms: int | None = None


class VoiceHistoryOut(ORMModel):
    id: str
    transcript: str
    language: str | None
    intent: str | None
    product_name: str | None
    quantity: float | None
    unit: str | None
    confidence: float | None
    status: str
    response: str | None
    created_at: datetime


VoiceProcessResponse.model_rebuild()


# --------------------------- Suppliers ---------------------------
class SupplierProductOut(ORMModel):
    id: str
    name: str
    name_local: str | None = None
    category: str
    default_unit: str
    current_stock: float
    purchase_price: float
    selling_price: float


class SupplierOut(ORMModel):
    id: str
    name: str
    phone: str | None = None
    email: str | None = None
    address: str | None = None
    notes: str | None = None
    products: list[SupplierProductOut] = []


# --------------------------- Purchases ---------------------------
class PurchaseItemIn(BaseModel):
    product_id: str
    quantity: float = Field(gt=0)
    unit: str = "kg"
    purchase_price: float = Field(ge=0)


class PurchaseCreate(BaseModel):
    supplier_id: str
    items: list[PurchaseItemIn] = Field(min_length=1)
    notes: str | None = None
    status: str = "pending"  # pending | ordered | received


class PurchaseItemOut(ORMModel):
    id: str
    product_id: str
    quantity: float
    unit: str
    purchase_price: float


class PurchaseOut(ORMModel):
    id: str
    supplier_id: str | None
    supplier_name: str | None = None
    total: float
    status: str
    notes: str | None = None
    items: list[PurchaseItemOut] = []
    created_at: datetime
