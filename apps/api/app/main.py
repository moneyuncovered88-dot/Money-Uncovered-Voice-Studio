"""FastAPI application entrypoint.

Run locally:
    cd apps/api
    uvicorn app.main:app --reload --port 8000
"""

from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import __version__
from app.api.routes import (
    account,
    config,
    generation,
    health,
    projects,
    pronunciations,
    voices,
)
from app.config import get_settings
from app.errors import register_exception_handlers
from app.logging_config import configure_logging, get_logger

API_PREFIX = "/api"


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    configure_logging(settings.log_level)
    logger = get_logger("app.main")
    logger.info(
        "startup: env=%s provider=%s supabase=%s",
        settings.app_env,
        settings.tts_provider,
        settings.supabase_configured,
    )
    yield
    logger.info("shutdown")


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title="MUS Voices API",
        version=__version__,
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    register_exception_handlers(app)

    # Health at root (used by load balancers / uptime checks).
    app.include_router(health.router)

    # Application API under /api.
    app.include_router(projects.router, prefix=API_PREFIX)
    app.include_router(generation.router, prefix=API_PREFIX)
    app.include_router(voices.router, prefix=API_PREFIX)
    app.include_router(pronunciations.router, prefix=API_PREFIX)
    app.include_router(config.router, prefix=API_PREFIX)
    app.include_router(account.router, prefix=API_PREFIX)

    @app.get("/")
    def root() -> dict[str, str]:
        return {"service": "mus-voices-api", "version": __version__}

    return app


app = create_app()
