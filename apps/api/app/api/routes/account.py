"""Account-level endpoints: usage, plan catalog, support tickets."""

from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.dependencies import CurrentUserDep, SupabaseDep
from app.errors import ValidationError
from app.services import plans, support_service, usage_service

router = APIRouter(tags=["account"])


@router.get("/usage/summary")
def usage_summary(user: CurrentUserDep, client: SupabaseDep) -> dict:
    return usage_service.usage_summary(client, user.id)


@router.get("/plans")
def list_plans(user: CurrentUserDep, client: SupabaseDep) -> dict:
    return {
        "current_plan": usage_service.get_plan_key(client, user.id),
        "plans": [p.to_public() for p in plans.list_plans()],
    }


class TicketCreate(BaseModel):
    topic: str | None = Field(default=None, max_length=120)
    message: str = Field(min_length=1, max_length=4000)


@router.get("/support/tickets")
def list_tickets(user: CurrentUserDep, client: SupabaseDep) -> list[dict]:
    return support_service.list_tickets(client, user.id)


@router.post("/support/tickets", status_code=201)
def create_ticket(body: TicketCreate, user: CurrentUserDep, client: SupabaseDep) -> dict:
    if not body.message.strip():
        raise ValidationError("Please describe your issue.")
    return support_service.create_ticket(client, user.id, body.topic, body.message.strip())
