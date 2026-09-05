"""FastAPI dependencies: authentication and shared resources.

Authentication verifies the Supabase access token (JWT) that the frontend
sends as `Authorization: Bearer <token>`. Verification is done locally with
the project's JWT secret (HS256) — no network round-trip per request.
"""

from __future__ import annotations

from typing import Annotated

import jwt
from fastapi import Depends, Header
from pydantic import BaseModel
from supabase import Client

from app.config import Settings, get_settings
from app.errors import AuthError
from app.services.supabase_client import get_service_client


class CurrentUser(BaseModel):
    """The authenticated user derived from a verified Supabase JWT."""

    id: str
    email: str | None = None


def _extract_bearer(authorization: str | None) -> str:
    if not authorization:
        raise AuthError("Missing Authorization header")
    parts = authorization.split(" ", 1)
    if len(parts) != 2 or parts[0].lower() != "bearer" or not parts[1].strip():
        raise AuthError("Invalid Authorization header; expected 'Bearer <token>'")
    return parts[1].strip()


def get_current_user(
    authorization: Annotated[str | None, Header()] = None,
    settings: Annotated[Settings, Depends(get_settings)] = None,  # type: ignore[assignment]
) -> CurrentUser:
    """Verify the Supabase JWT and return the current user."""
    token = _extract_bearer(authorization)

    if not settings.supabase_jwt_secret:
        raise AuthError(
            "Server auth is not configured (missing SUPABASE_JWT_SECRET)",
            code="auth_not_configured",
        )

    try:
        claims = jwt.decode(
            token,
            settings.supabase_jwt_secret,
            algorithms=["HS256"],
            audience="authenticated",
        )
    except jwt.ExpiredSignatureError as exc:
        raise AuthError("Session expired; please sign in again") from exc
    except jwt.InvalidTokenError as exc:
        raise AuthError("Invalid authentication token") from exc

    user_id = claims.get("sub")
    if not user_id:
        raise AuthError("Token missing subject claim")

    return CurrentUser(id=user_id, email=claims.get("email"))


def get_supabase() -> Client:
    """Provide the service-role Supabase client."""
    return get_service_client()


CurrentUserDep = Annotated[CurrentUser, Depends(get_current_user)]
SupabaseDep = Annotated[Client, Depends(get_supabase)]
SettingsDep = Annotated[Settings, Depends(get_settings)]
