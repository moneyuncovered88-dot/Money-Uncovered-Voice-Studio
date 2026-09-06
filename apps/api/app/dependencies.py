"""FastAPI dependencies: authentication and shared resources.

Authentication verifies the Supabase access token (JWT) that the frontend
sends as `Authorization: Bearer <token>`. Supabase signs access tokens either
with an asymmetric key (ES256/RS256, the default for newer projects) or with
the legacy shared secret (HS256). We support both: the token's own `alg`
header decides which path runs. Asymmetric keys are fetched from the project's
JWKS endpoint and cached by PyJWKClient, so there is no per-request fetch.
"""

from __future__ import annotations

from functools import lru_cache
from typing import Annotated

import jwt
from fastapi import Depends, Header
from jwt import PyJWKClient
from pydantic import BaseModel
from supabase import Client

from app.config import Settings, get_settings
from app.errors import AuthError
from app.services.supabase_client import get_service_client

_ASYMMETRIC_ALGS = ("ES256", "RS256")


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


@lru_cache(maxsize=1)
def _jwks_client(jwks_url: str) -> PyJWKClient:
    """Cached JWKS client (caches signing keys internally across requests)."""
    return PyJWKClient(jwks_url)


def _verify_asymmetric(token: str, settings: Settings) -> dict:
    if not settings.supabase_url:
        raise AuthError(
            "Server auth is not configured (missing SUPABASE_URL)",
            code="auth_not_configured",
        )
    jwks_url = settings.supabase_url.rstrip("/") + "/auth/v1/.well-known/jwks.json"
    try:
        signing_key = _jwks_client(jwks_url).get_signing_key_from_jwt(token)
        return jwt.decode(
            token,
            signing_key.key,
            algorithms=list(_ASYMMETRIC_ALGS),
            audience="authenticated",
        )
    except jwt.ExpiredSignatureError as exc:
        raise AuthError("Session expired; please sign in again") from exc
    except jwt.InvalidTokenError as exc:
        raise AuthError("Invalid authentication token") from exc
    except Exception as exc:  # noqa: BLE001 - JWKS fetch / key errors
        raise AuthError("Could not verify authentication token") from exc


def _verify_hs256(token: str, settings: Settings) -> dict:
    if not settings.supabase_jwt_secret:
        raise AuthError(
            "Server auth is not configured (missing SUPABASE_JWT_SECRET)",
            code="auth_not_configured",
        )
    try:
        return jwt.decode(
            token,
            settings.supabase_jwt_secret,
            algorithms=["HS256"],
            audience="authenticated",
        )
    except jwt.ExpiredSignatureError as exc:
        raise AuthError("Session expired; please sign in again") from exc
    except jwt.InvalidTokenError as exc:
        raise AuthError("Invalid authentication token") from exc


def get_current_user(
    authorization: Annotated[str | None, Header()] = None,
    settings: Annotated[Settings, Depends(get_settings)] = None,  # type: ignore[assignment]
) -> CurrentUser:
    """Verify the Supabase JWT and return the current user."""
    token = _extract_bearer(authorization)

    try:
        alg = jwt.get_unverified_header(token).get("alg", "")
    except jwt.InvalidTokenError as exc:
        raise AuthError("Invalid authentication token") from exc

    if alg in _ASYMMETRIC_ALGS:
        claims = _verify_asymmetric(token, settings)
    else:
        claims = _verify_hs256(token, settings)

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
