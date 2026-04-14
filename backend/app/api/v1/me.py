from fastapi import APIRouter, Depends

from app.core.auth import FirebaseUser, get_current_firebase_user
from app.db.models import User
from app.db.session import DbSession
from app.schemas.user import UserRead

router = APIRouter(tags=["users"])


@router.get("/me", response_model=UserRead)
def get_me(
    db: DbSession,
    firebase_user: FirebaseUser = Depends(get_current_firebase_user),
) -> User:
    user = db.query(User).filter(User.firebase_uid == firebase_user.uid).one_or_none()

    if user is None:
        user = User(
            firebase_uid=firebase_user.uid,
            email=firebase_user.email,
            display_name=firebase_user.name,
            photo_url=firebase_user.picture,
        )
        db.add(user)
    else:
        user.email = firebase_user.email
        user.display_name = firebase_user.name
        user.photo_url = firebase_user.picture

    db.commit()
    db.refresh(user)

    return user
