from collections.abc import Generator
from typing import Annotated

from fastapi import Depends
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import settings
from app.db.models import Base

engine = create_engine(settings.database_url, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
_db_initialized = False


def create_db_and_tables() -> None:
    global _db_initialized
    if _db_initialized:
        return

    Base.metadata.create_all(bind=engine)
    _apply_schema_updates()
    _db_initialized = True


def _apply_schema_updates() -> None:
    statements = [
        """
        ALTER TABLE active_projects
        ADD COLUMN IF NOT EXISTS reference_images JSON NOT NULL DEFAULT '[]'::json
        """,
    ]

    with engine.begin() as connection:
        for statement in statements:
            connection.execute(text(statement))


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


DbSession = Annotated[Session, Depends(get_db)]
