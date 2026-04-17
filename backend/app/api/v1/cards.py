import json
from uuid import uuid4

from fastapi import APIRouter, Depends, File, Form, HTTPException, Response, UploadFile, status
from sqlalchemy import desc

from app.core.auth import FirebaseUser, get_current_firebase_user
from app.db.models import Card
from app.db.session import DbSession, create_db_and_tables
from app.schemas.card import CardRead, ProjectContextPayload
from app.services.openai_card_generator import generate_card_payload_for_image
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
    parsed_project_context = _parse_project_context(project_context)

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
