import json
from uuid import uuid4

from fastapi import APIRouter, Depends, File, Form, HTTPException, Response, UploadFile, status
from sqlalchemy import desc

from app.core.auth import FirebaseUser, get_current_firebase_user
from app.db.models import Card, CardRefinement, User
from app.db.session import DbSession, create_db_and_tables
from app.schemas.card import (
    CardRead,
    CardRefinementCreate,
    CardRefinementRead,
    CardShareRead,
    ProjectContextPayload,
)
from app.schemas.project import ActiveProjectRead
from app.services.card_refinements import serialize_card
from app.services.openai_card_generator import generate_card_payload_for_image, refine_card_payload
from app.services.projects import get_active_project
from app.services.shares import build_share_url, get_or_create_card_share
from app.services.storage import delete_card_image, upload_card_image
from app.services.users import get_or_create_user

router = APIRouter(prefix="/cards", tags=["cards"])


@router.post("", response_model=CardRead, status_code=status.HTTP_201_CREATED)
async def create_card(
    db: DbSession,
    image: UploadFile = File(...),
    source_type: str = Form("library"),
    project_context: str | None = Form(None),
    firebase_user: FirebaseUser = Depends(get_current_firebase_user),
) -> Card:
    create_db_and_tables()

    user = get_or_create_user(db, firebase_user)
    card_id = str(uuid4())
    parsed_project_context = _resolve_project_context(
        db=db,
        user=user,
        project_context=project_context,
    )

    storage_path, image_url = await upload_card_image(
        card_id=card_id,
        firebase_uid=firebase_user.uid,
        image=image,
    )
    card = Card(
        id=card_id,
        user_id=user.id,
        image_url=image_url,
        source_type=source_type,
        storage_path=storage_path,
        **generate_card_payload_for_image(
            image_url=image_url,
            project_context=parsed_project_context,
        ),
    )
    db.add(card)

    db.commit()
    db.refresh(card)

    return card


@router.get("", response_model=list[CardRead])
def list_cards(
    db: DbSession,
    firebase_user: FirebaseUser = Depends(get_current_firebase_user),
) -> list[Card]:
    create_db_and_tables()

    user = get_or_create_user(db, firebase_user)
    db.commit()

    return (
        db.query(Card)
        .filter(Card.user_id == user.id)
        .order_by(desc(Card.created_at))
        .all()
    )


@router.get("/{card_id}", response_model=CardRead)
def get_card(
    card_id: str,
    db: DbSession,
    firebase_user: FirebaseUser = Depends(get_current_firebase_user),
) -> Card:
    create_db_and_tables()

    user = get_or_create_user(db, firebase_user)
    db.commit()

    card = db.query(Card).filter(Card.id == card_id, Card.user_id == user.id).one_or_none()

    if card is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Card not found.",
        )

    return card


@router.get("/{card_id}/refinements", response_model=list[CardRefinementRead])
def list_card_refinements(
    card_id: str,
    db: DbSession,
    firebase_user: FirebaseUser = Depends(get_current_firebase_user),
) -> list[CardRefinement]:
    create_db_and_tables()

    user = get_or_create_user(db, firebase_user)
    card = db.query(Card).filter(Card.id == card_id, Card.user_id == user.id).one_or_none()

    if card is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Card not found.",
        )

    return (
        db.query(CardRefinement)
        .filter(CardRefinement.card_id == card.id)
        .order_by(desc(CardRefinement.created_at))
        .all()
    )


@router.post("/{card_id}/refinements", response_model=CardRefinementRead, status_code=status.HTTP_201_CREATED)
def create_card_refinement(
    card_id: str,
    payload: CardRefinementCreate,
    db: DbSession,
    firebase_user: FirebaseUser = Depends(get_current_firebase_user),
) -> CardRefinement:
    create_db_and_tables()

    user = get_or_create_user(db, firebase_user)
    card = db.query(Card).filter(Card.id == card_id, Card.user_id == user.id).one_or_none()

    if card is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Card not found.",
        )

    project_context = _resolve_project_context(db=db, user=user, project_context=None)
    refined_card = refine_card_payload(
        image_url=card.image_url,
        base_card=serialize_card(card),
        instruction=payload.instruction,
        project_context=project_context,
    )

    refinement = CardRefinement(
        card_id=card.id,
        preset_label=payload.preset_label,
        instruction=payload.instruction,
        refined_card={
            **refined_card,
            "id": card.id,
            "image_url": card.image_url,
            "source_type": card.source_type,
            "created_at": card.created_at.isoformat(),
            "updated_at": card.updated_at.isoformat(),
        },
    )
    db.add(refinement)
    db.commit()
    db.refresh(refinement)

    return refinement


@router.post("/{card_id}/share", response_model=CardShareRead, status_code=status.HTTP_200_OK)
def create_or_get_card_share(
    card_id: str,
    db: DbSession,
    firebase_user: FirebaseUser = Depends(get_current_firebase_user),
) -> CardShareRead:
    create_db_and_tables()

    user = get_or_create_user(db, firebase_user)
    card = db.query(Card).filter(Card.id == card_id, Card.user_id == user.id).one_or_none()

    if card is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Card not found.",
        )

    share = get_or_create_card_share(db, card)
    db.commit()
    db.refresh(share)

    return CardShareRead(
        id=share.id,
        card_id=share.card_id,
        share_token=share.share_token,
        share_url=build_share_url(share.share_token),
        created_at=share.created_at,
        updated_at=share.updated_at,
    )


@router.delete("/{card_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_card(
    card_id: str,
    db: DbSession,
    firebase_user: FirebaseUser = Depends(get_current_firebase_user),
) -> Response:
    create_db_and_tables()

    user = get_or_create_user(db, firebase_user)
    card = db.query(Card).filter(Card.id == card_id, Card.user_id == user.id).one_or_none()

    if card is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Card not found.",
        )

    storage_path = card.storage_path
    db.delete(card)
    db.commit()
    delete_card_image(storage_path)

    return Response(status_code=status.HTTP_204_NO_CONTENT)


def _parse_project_context(project_context: str | None) -> ProjectContextPayload | None:
    if not project_context:
        return None

    try:
        return ProjectContextPayload.model_validate(json.loads(project_context))
    except (json.JSONDecodeError, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid project context.",
        ) from exc


def _resolve_project_context(
    *,
    db: DbSession,
    user: User,
    project_context: str | None,
) -> ProjectContextPayload | None:
    parsed_project_context = _parse_project_context(project_context)

    if parsed_project_context is not None:
        return parsed_project_context

    active_project = get_active_project(db, user)

    if active_project is None:
        return None

    return ProjectContextPayload.from_active_project(
        ActiveProjectRead.model_validate(active_project)
    )
