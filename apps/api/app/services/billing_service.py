"""Stripe billing.

Fully wired but inert until STRIPE_SECRET_KEY (+ price IDs + webhook secret)
are configured. `stripe` is imported lazily so the app runs without the keys.
On a completed checkout / subscription change, the user's plan in
`user_subscriptions` is updated. The service-role Supabase client is used for
all writes.
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from supabase import Client

from app.config import get_settings
from app.errors import QuotaError, UpstreamError, ValidationError
from app.logging_config import get_logger
from app.services import plans

logger = get_logger("app.billing")

_SUBS = "user_subscriptions"
_VALID_PERIODS = ("monthly", "yearly")


def is_configured() -> bool:
    return get_settings().stripe_configured


def _stripe():
    import stripe  # lazy: package present in the image, keys may be absent

    stripe.api_key = get_settings().stripe_secret_key
    return stripe


def _get_or_create_customer(stripe, client: Client, user_id: str, email: str | None) -> str:
    """Return a Stripe customer id, reusing the one stored on the subscription row."""
    try:
        rows = (
            client.table(_SUBS).select("stripe_customer_id").eq("user_id", user_id).limit(1)
            .execute().data or []
        )
        existing = rows[0].get("stripe_customer_id") if rows else None
    except Exception:  # noqa: BLE001
        existing = None
    if existing:
        return existing

    customer = stripe.Customer.create(email=email or None, metadata={"user_id": user_id})
    try:
        client.table(_SUBS).upsert(
            {"user_id": user_id, "stripe_customer_id": customer.id, "updated_at": _now()}
        ).execute()
    except Exception as exc:  # noqa: BLE001
        logger.debug("could not persist customer id: %s", exc)
    return customer.id


def create_checkout(
    client: Client, user_id: str, email: str | None, plan: str, period: str
) -> str:
    settings = get_settings()
    if not settings.stripe_configured:
        raise UpstreamError(
            "Billing isn't enabled yet. Please check back soon.",
            code="billing_not_configured",
            status_code=503,
        )
    plan = (plan or "").lower()
    period = (period or "monthly").lower()
    if plan not in plans.PLANS or plan == "free":
        raise ValidationError("Choose a paid plan to upgrade.")
    if period not in _VALID_PERIODS:
        raise ValidationError("Billing period must be monthly or yearly.")

    price_id = settings.stripe_price_id(plan, period)
    if not price_id:
        raise UpstreamError(
            f"No Stripe price configured for {plan}/{period}.",
            code="price_not_configured",
            status_code=503,
        )

    stripe = _stripe()
    base = settings.frontend_url.rstrip("/")
    # Wrap the whole Stripe interaction so any failure (bad key, unknown price,
    # test/live mismatch) becomes a clean, CORS-safe error the UI can display.
    try:
        customer_id = _get_or_create_customer(stripe, client, user_id, email)
        session = stripe.checkout.Session.create(
            mode="subscription",
            customer=customer_id,
            line_items=[{"price": price_id, "quantity": 1}],
            success_url=f"{base}/plans?checkout=success",
            cancel_url=f"{base}/plans?checkout=cancelled",
            client_reference_id=user_id,
            metadata={"user_id": user_id, "plan": plan, "period": period},
            allow_promotion_codes=True,
        )
    except UpstreamError:
        raise
    except Exception as exc:  # noqa: BLE001
        logger.warning("stripe checkout failed: %s", exc)
        raise UpstreamError(
            f"Stripe checkout failed: {exc}", code="stripe_error", status_code=502
        ) from exc
    return session.url


def create_portal(client: Client, user_id: str) -> str:
    settings = get_settings()
    if not settings.stripe_configured:
        raise UpstreamError(
            "Billing isn't enabled yet.", code="billing_not_configured", status_code=503
        )
    stripe = _stripe()
    rows = (
        client.table(_SUBS).select("stripe_customer_id").eq("user_id", user_id).limit(1)
        .execute().data or []
    )
    customer_id = rows[0].get("stripe_customer_id") if rows else None
    if not customer_id:
        raise QuotaError("No billing account yet — upgrade to a paid plan first.")
    base = settings.frontend_url.rstrip("/")
    try:
        session = stripe.billing_portal.Session.create(
            customer=customer_id, return_url=f"{base}/plans"
        )
    except Exception as exc:  # noqa: BLE001
        raise UpstreamError(f"Stripe portal failed: {exc}", code="stripe_error", status_code=502) from exc
    return session.url


def handle_webhook(payload: bytes, sig_header: str | None, client: Client) -> dict[str, Any]:
    settings = get_settings()
    if not settings.stripe_configured or not settings.stripe_webhook_secret:
        raise UpstreamError("Billing webhook not configured.", code="billing_not_configured", status_code=503)
    stripe = _stripe()
    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header or "", settings.stripe_webhook_secret
        )
    except Exception as exc:  # noqa: BLE001 - bad signature / malformed
        raise ValidationError(f"Invalid webhook signature: {exc}") from exc

    etype = event["type"]
    obj = event["data"]["object"]

    if etype == "checkout.session.completed":
        user_id = (obj.get("metadata") or {}).get("user_id") or obj.get("client_reference_id")
        plan = (obj.get("metadata") or {}).get("plan")
        if user_id and plan:
            _set_subscription(client, user_id, plan, "active", obj.get("customer"), obj.get("subscription"))
    elif etype in ("customer.subscription.updated", "customer.subscription.deleted"):
        _sync_subscription(client, stripe, obj)

    return {"received": True, "type": etype}


def _sync_subscription(client: Client, stripe, sub: dict[str, Any]) -> None:
    customer_id = sub.get("customer")
    status = sub.get("status", "active")
    # Map the price back to a plan via configured price IDs.
    settings = get_settings()
    price_id = None
    try:
        price_id = sub["items"]["data"][0]["price"]["id"]
    except (KeyError, IndexError, TypeError):
        pass
    plan = "free"
    for key in ("starter", "pro", "business"):
        for period in _VALID_PERIODS:
            if price_id and settings.stripe_price_id(key, period) == price_id:
                plan = key
    if status in ("canceled", "unpaid", "incomplete_expired"):
        plan, status = "free", "canceled"
    rows = (
        client.table(_SUBS).select("user_id").eq("stripe_customer_id", customer_id).limit(1)
        .execute().data or []
    )
    if rows:
        _set_subscription(client, rows[0]["user_id"], plan, status, customer_id, sub.get("id"))


def _set_subscription(
    client: Client, user_id: str, plan: str, status: str, customer_id: Any, sub_id: Any
) -> None:
    client.table(_SUBS).upsert(
        {
            "user_id": user_id,
            "plan": plan,
            "status": status,
            "stripe_customer_id": customer_id,
            "stripe_subscription_id": sub_id,
            "updated_at": _now(),
        }
    ).execute()
    logger.info("subscription updated: user=%s plan=%s status=%s", user_id, plan, status)


def _now() -> str:
    return datetime.now(UTC).isoformat()
