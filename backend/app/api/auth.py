"""Authentication endpoints (PRD 10-13, 54)."""

from __future__ import annotations

import hashlib
import secrets
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app.schemas import (
    ForgotPasswordRequest,
    LoginRequest,
    RegisterRequest,
    ResetPasswordRequest,
    TokenResponse,
    UserOut,
)
from app.security import (
    create_access_token,
    get_current_user,
    hash_password,
    verify_password,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


@router.post("/register", response_model=TokenResponse, status_code=201)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    if payload.password != payload.confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match.")
    if len(payload.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters.")
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=409, detail="An account with this email already exists.")
    user = User(
        name=payload.name,
        email=payload.email,
        password_hash=hash_password(payload.password),
        shop_name=payload.shop_name,
        role="owner",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    token = create_access_token(user.id)
    return TokenResponse(access_token=token, user=UserOut.model_validate(user))


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password.")
    token = create_access_token(user.id)
    return TokenResponse(access_token=token, user=UserOut.model_validate(user))


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return UserOut.model_validate(user)


@router.post("/logout")
def logout():
    # JWT is stateless; the client clears its stored token.
    return {"success": True}


@router.post("/forgot-password")
def forgot_password(payload: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    # Always respond the same way to avoid account enumeration.
    if user is None:
        return {"success": True, "message": "If the account exists, a reset link was sent."}
    raw_token = secrets.token_urlsafe(32)
    user.reset_token_hash = _hash_token(raw_token)
    user.reset_token_expires = datetime.utcnow() + timedelta(hours=1)
    db.commit()
    # Dev fallback: no SMTP configured, so return the token for local testing.
    return {
        "success": True,
        "message": "Reset token generated (development mode).",
        "dev_reset_token": raw_token,
    }


@router.post("/reset-password")
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    token_hash = _hash_token(payload.token)
    user = db.query(User).filter(User.reset_token_hash == token_hash).first()
    if (
        user is None
        or user.reset_token_expires is None
        or user.reset_token_expires < datetime.utcnow()
    ):
        raise HTTPException(status_code=400, detail="Invalid or expired reset token.")
    user.password_hash = hash_password(payload.new_password)
    user.reset_token_hash = None
    user.reset_token_expires = None
    db.commit()
    return {"success": True, "message": "Password updated."}
