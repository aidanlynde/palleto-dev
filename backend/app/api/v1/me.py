from fastapi import APIRouter, Depends

from app.core.auth import FirebaseUser, get_current_firebase_user
from app.db.models import User
from app.db.session import DbSession, create_db_and_tables
from app.schemas.user import UserRead
from app.services.users import get_or_create_user

router = APIRouter(tags=["users"])


@router.get("/me", response_model=UserRead)
def get_me(
    db: DbSession,
    firebase_user: FirebaseUser = Depends(get_current_firebase_user),
) -> User:
    create_db_and_tables()

    user = get_or_create_user(db, firebase_user)
    db.commit()
    db.refresh(user)

    return user
