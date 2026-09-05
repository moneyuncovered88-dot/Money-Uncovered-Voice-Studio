"""Supabase client factory.

The backend uses the SERVICE ROLE key, which bypasses Row Level Security.
Because of that, every query MUST be scoped by the authenticated user's id.
The service role key is server-side only and never sent to the browser.
"""

from __future__ import annotations

from functools import lru_cache

from supabase import Client, create_client

from app.config import get_settings
from app.errors import UpstreamError


@lru_cache(maxsize=1)
def get_service_client() -> Client:
    """Return a cached service-role Supabase client.

    Raises UpstreamError if Supabase is not configured, so the failure is
    explicit rather than a confusing downstream error.
    """
    settings = get_settings()
    if not settings.supabase_configured:
        raise UpstreamError(
            "Supabase is not configured. Set SUPABASE_URL and "
            "SUPABASE_SERVICE_ROLE_KEY.",
            code="supabase_not_configured",
        )
    return create_client(settings.supabase_url, settings.supabase_service_role_key)
