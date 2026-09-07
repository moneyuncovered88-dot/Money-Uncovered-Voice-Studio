"""Stripe billing endpoints. Inert until Stripe keys are configured."""

from __future__ import annotations

from fastapi import APIRouter, Request
from pydantic import BaseModel

from app.dependencies import SupabaseDep, VerifiedUserDep
from app.services import billing_service

router = APIRouter(prefix="/billing", tags=["billing"])


@router.get("/status")
def billing_status() -> dict:
    return {"configured": billing_service.is_configured()}


class CheckoutRequest(BaseModel):
    plan: str
    period: str = "monthly"


@router.post("/checkout")
def create_checkout(body: CheckoutRequest, user: VerifiedUserDep, client: SupabaseDep) -> dict:
    url = billing_service.create_checkout(client, user.id, user.email, body.plan, body.period)
    return {"url": url}


@router.post("/portal")
def create_portal(user: VerifiedUserDep, client: SupabaseDep) -> dict:
    return {"url": billing_service.create_portal(client, user.id)}


@router.post("/webhook")
async def webhook(request: Request, client: SupabaseDep) -> dict:
    payload = await request.body()
    sig = request.headers.get("stripe-signature")
    return billing_service.handle_webhook(payload, sig, client)
