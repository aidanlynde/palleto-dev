from sqlalchemy.orm import Session

from app.core.auth import FirebaseUser
from app.db.models import User


def get_or_create_user(db: Session, firebase_user: FirebaseUser) -> User:
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

    db.flush()

    return user
