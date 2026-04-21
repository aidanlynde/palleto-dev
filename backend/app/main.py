from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.cards import router as cards_router
from app.api.v1.health import router as health_router
from app.api.v1.me import router as me_router
from app.api.v1.projects import router as projects_router
from app.core.config import settings


def create_app() -> FastAPI:
    app = FastAPI(title=settings.app_name)

    if settings.cors_origins:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=settings.cors_origins,
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )

    app.include_router(health_router, prefix=settings.api_v1_prefix)
    app.include_router(me_router, prefix=settings.api_v1_prefix)
    app.include_router(projects_router, prefix=settings.api_v1_prefix)
    app.include_router(cards_router, prefix=settings.api_v1_prefix)

    return app


app = create_app()
