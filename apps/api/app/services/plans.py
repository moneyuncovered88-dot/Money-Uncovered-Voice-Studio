"""Plan catalog and per-plan limits.

Plans are defined in code (not the database) so limits are versioned with the
app and easy to reason about. A user's *current* plan is stored per-user in the
`user_subscriptions` table; everything else (quotas, feature gates) is derived
from the plan key here.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass(frozen=True)
class Plan:
    key: str
    name: str
    price_monthly: int
    price_yearly: int
    # Limits
    monthly_char_quota: int
    max_voices: int  # -1 = unlimited
    max_chunks_per_job: int
    max_concurrent_jobs: int
    preview_max_chars: int
    priority: int  # higher = sooner in a queue (future use)
    # Feature gates
    ads: bool
    voice_reference: bool
    commercial_use: bool
    features: list[str] = field(default_factory=list)

    def to_public(self) -> dict[str, Any]:
        return {
            "key": self.key,
            "name": self.name,
            "price_monthly": self.price_monthly,
            "price_yearly": self.price_yearly,
            "monthly_char_quota": self.monthly_char_quota,
            "max_voices": self.max_voices,
            "max_chunks_per_job": self.max_chunks_per_job,
            "max_concurrent_jobs": self.max_concurrent_jobs,
            "preview_max_chars": self.preview_max_chars,
            "ads": self.ads,
            "voice_reference": self.voice_reference,
            "commercial_use": self.commercial_use,
            "features": self.features,
        }


PLANS: dict[str, Plan] = {
    "free": Plan(
        key="free",
        name="Free",
        price_monthly=0,
        price_yearly=0,
        monthly_char_quota=10_000,
        max_voices=1,
        max_chunks_per_job=40,
        max_concurrent_jobs=1,
        preview_max_chars=600,
        priority=0,
        ads=True,
        voice_reference=False,
        commercial_use=False,
        features=["10,000 characters / month", "1 voice profile", "Ads supported"],
    ),
    "starter": Plan(
        key="starter",
        name="Starter",
        price_monthly=9,
        price_yearly=90,
        monthly_char_quota=150_000,
        max_voices=3,
        max_chunks_per_job=200,
        max_concurrent_jobs=1,
        preview_max_chars=1000,
        priority=1,
        ads=False,
        voice_reference=True,
        commercial_use=False,
        features=["150,000 characters / month", "3 voice profiles", "No ads"],
    ),
    "pro": Plan(
        key="pro",
        name="Pro",
        price_monthly=29,
        price_yearly=290,
        monthly_char_quota=750_000,
        max_voices=10,
        max_chunks_per_job=500,
        max_concurrent_jobs=2,
        preview_max_chars=1500,
        priority=2,
        ads=False,
        voice_reference=True,
        commercial_use=True,
        features=["750,000 characters / month", "10 voice profiles", "Priority queue"],
    ),
    "business": Plan(
        key="business",
        name="Business",
        price_monthly=79,
        price_yearly=790,
        monthly_char_quota=3_000_000,
        max_voices=-1,
        max_chunks_per_job=2000,
        max_concurrent_jobs=3,
        preview_max_chars=2000,
        priority=3,
        ads=False,
        voice_reference=True,
        commercial_use=True,
        features=["3,000,000 characters / month", "Unlimited voices", "Highest priority"],
    ),
}

DEFAULT_PLAN_KEY = "free"


def get_plan(key: str | None) -> Plan:
    return PLANS.get(key or DEFAULT_PLAN_KEY, PLANS[DEFAULT_PLAN_KEY])


def list_plans() -> list[Plan]:
    return list(PLANS.values())
