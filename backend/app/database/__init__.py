"""Database engine, session factory, and declarative base."""

from __future__ import annotations

import os
from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker, Session

from app.config import settings


def _ensure_sqlite_dir(url: str) -> None:
    """Create the parent directory for a SQLite file DB if needed."""
    prefix = "sqlite:///"
    if url.startswith(prefix):
        path = url[len(prefix):]
        if path and path not in (":memory:",):
            directory = os.path.dirname(os.path.abspath(path))
            os.makedirs(directory, exist_ok=True)


_ensure_sqlite_dir(settings.database_url)

connect_args = (
    {"check_same_thread": False}
    if settings.database_url.startswith("sqlite")
    else {}
)

engine = create_engine(
    settings.database_url,
    connect_args=connect_args,
    pool_pre_ping=True,
)

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


class Base(DeclarativeBase):
    pass


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency that yields a scoped DB session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    """Create all tables. Import models first so they register on Base."""
    from app import models  # noqa: F401  (ensures models are registered)

    Base.metadata.create_all(bind=engine)
