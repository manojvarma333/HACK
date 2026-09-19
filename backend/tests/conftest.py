"""Test fixtures. Uses an isolated temp SQLite DB seeded with demo data."""

from __future__ import annotations

import os
import tempfile

# Point the app at a throwaway DB BEFORE importing any app module.
_TMP_DB = os.path.join(tempfile.gettempdir(), "voicestock_test.db")
if os.path.exists(_TMP_DB):
    os.remove(_TMP_DB)
os.environ["DATABASE_URL"] = f"sqlite:///{_TMP_DB}"
os.environ["GEMINI_API_KEY"] = ""
os.environ["WHISPER_MODEL"] = ""  # force Simulation Mode in tests

import pytest  # noqa: E402

from app.database import Base, SessionLocal, engine  # noqa: E402
from app.seed import seed  # noqa: E402


@pytest.fixture()
def db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    session = SessionLocal()
    seed(session, force=True)
    try:
        yield session
    finally:
        session.close()
