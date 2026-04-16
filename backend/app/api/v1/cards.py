import json

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy import desc

from app.core.auth import FirebaseUser, get_current_firebase_user
from app.db.models import Card
from app.db.session import DbSession, create_db_and_tables
from app.schemas.card import CardRead, ProjectContextPayload
from app.services.card_generator import generate_card_payload
from app.services.storage import upload_card_image
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
    card = Card(
        user_id=user.id,
        image_url="pending",
        source_type=source_type,
        storage_path=None,
        **generate_card_payload(_parse_project_context(project_context)),
    )
    db.add(card)
    db.flush()

    storage_path, image_url = await upload_card_image(
        card_id=card.id,
        firebase_uid=firebase_user.uid,
        image=image,
    )
    card.storage_path = storage_path
    card.image_url = image_url

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
