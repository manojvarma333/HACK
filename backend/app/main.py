"""VoiceStock AI — FastAPI application entry point."""

from __future__ import annotations

import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api import auth, inventory, products, suppliers, transactions, voice
from app.config import settings
from app.database import SessionLocal, init_db
from app.services import whisper_service

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)
logger = logging.getLogger("voicestock")

app = FastAPI(
    title="VoiceStock AI API",
    description="Voice-first inventory management for Kirana stores.",
    version="1.0.0",
    docs_url="/api/docs",
    openapi_url="/api/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(voice.router)
app.include_router(products.router)
app.include_router(inventory.router)
app.include_router(transactions.router)
app.include_router(suppliers.router)


@app.on_event("startup")
def on_startup() -> None:
    init_db()
    from app.seed import seed

    db = SessionLocal()
    try:
        result = seed(db)
        if result.get("seeded"):
            logger.info("Seeded demo data: %s products", result.get("products"))
    finally:
        db.close()
    logger.info(
        "Startup complete. Whisper=%s Gemini=%s default_mode=%s",
        whisper_service.is_available(),
        settings.gemini_enabled,
        settings.default_mode,
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled error on %s", request.url.path)
    return JSONResponse(
        status_code=500,
        content={"success": False, "error": {"code": "INTERNAL_ERROR",
                                              "message": "An unexpected error occurred."}},
    )


@app.get("/")
def root():
    return {"name": "VoiceStock AI", "status": "ok", "docs": "/api/docs"}


@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "whisper_available": whisper_service.is_available(),
        "gemini_available": settings.gemini_enabled,
        "mode": settings.default_mode,
    }
