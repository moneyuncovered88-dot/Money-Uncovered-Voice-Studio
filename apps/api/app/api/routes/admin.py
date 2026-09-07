"""Admin-only endpoints (gated by ADMIN_EMAILS)."""

from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel

from app.dependencies import AdminUserDep, SupabaseDep
from app.errors import ValidationError
from app.services import admin_service, feature_flags_service

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/overview")
def overview(user: AdminUserDep, client: SupabaseDep) -> dict:
    return admin_service.overview(client)


@router.get("/jobs")
def jobs(user: AdminUserDep, client: SupabaseDep, status: str | None = None) -> list[dict]:
    return admin_service.recent_jobs(client, status=status)


@router.get("/users")
def users(user: AdminUserDep, client: SupabaseDep) -> list[dict]:
    return admin_service.users(client)


@router.get("/tickets")
def tickets(user: AdminUserDep, client: SupabaseDep) -> list[dict]:
    return admin_service.tickets(client)


@router.get("/feature-flags")
def feature_flags(user: AdminUserDep, client: SupabaseDep) -> list[dict]:
    return feature_flags_service.list_flags(client)


class FlagUpdate(BaseModel):
    key: str
    enabled: bool


@router.post("/feature-flags")
def set_feature_flag(body: FlagUpdate, user: AdminUserDep, client: SupabaseDep) -> dict:
    if body.key not in feature_flags_service.KNOWN_FLAGS:
        raise ValidationError(f"Unknown feature flag '{body.key}'.")
    return feature_flags_service.set_flag(client, body.key, body.enabled)
