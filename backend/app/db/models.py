from datetime import datetime
from uuid import uuid4

from sqlalchemy import DateTime, ForeignKey, JSON, String, Text, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    firebase_uid: Mapped[str] = mapped_column(String(128), unique=True, index=True, nullable=False)
    email: Mapped[str | None] = mapped_column(String(320), nullable=True)
    display_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    photo_url: Mapped[str | None] = mapped_column(String(2048), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
    active_project: Mapped["ActiveProject | None"] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
        uselist=False,
    )
    cards: Mapped[list["Card"]] = relationship(back_populates="user")


class ActiveProject(Base):
    __tablename__ = "active_projects"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    user_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        index=True,
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    project_type: Mapped[str] = mapped_column(String(120), nullable=False)
    audience: Mapped[str | None] = mapped_column(String(255), nullable=True)
    desired_feeling: Mapped[str | None] = mapped_column(Text, nullable=True)
    avoid: Mapped[str | None] = mapped_column(Text, nullable=True)
    direction_tags: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    priorities: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    reference_links: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    user: Mapped[User] = relationship(back_populates="active_project")


class Card(Base):
    __tablename__ = "cards"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    user_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    image_url: Mapped[str] = mapped_column(String(4096), nullable=False)
    storage_path: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    source_type: Mapped[str] = mapped_column(String(32), nullable=False, default="library")
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    one_line_read: Mapped[str] = mapped_column(Text, nullable=False)
    creative_direction: Mapped[str] = mapped_column(Text, nullable=False)
    palette: Mapped[list[dict]] = mapped_column(JSON, nullable=False)
    visual_dna: Mapped[dict] = mapped_column(JSON, nullable=False)
    design_moves: Mapped[list[str]] = mapped_column(JSON, nullable=False)
    project_lens: Mapped[dict] = mapped_column(JSON, nullable=False)
    type_direction: Mapped[list[dict]] = mapped_column(JSON, nullable=False)
    search_language: Mapped[list[str]] = mapped_column(JSON, nullable=False)
    related_links: Mapped[list[dict]] = mapped_column(JSON, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    user: Mapped[User] = relationship(back_populates="cards")
    refinements: Mapped[list["CardRefinement"]] = relationship(
        back_populates="card",
        cascade="all, delete-orphan",
    )
    share: Mapped["CardShare | None"] = relationship(
        back_populates="card",
        cascade="all, delete-orphan",
        uselist=False,
    )


class CardRefinement(Base):
    __tablename__ = "card_refinements"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    card_id: Mapped[str] = mapped_column(
        ForeignKey("cards.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    preset_label: Mapped[str | None] = mapped_column(String(120), nullable=True)
    instruction: Mapped[str] = mapped_column(Text, nullable=False)
    refined_card: Mapped[dict] = mapped_column(JSON, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    card: Mapped[Card] = relationship(back_populates="refinements")


class CardShare(Base):
    __tablename__ = "card_shares"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    card_id: Mapped[str] = mapped_column(
        ForeignKey("cards.id", ondelete="CASCADE"),
        unique=True,
        index=True,
        nullable=False,
    )
    share_token: Mapped[str] = mapped_column(String(24), unique=True, index=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    card: Mapped[Card] = relationship(back_populates="share")
