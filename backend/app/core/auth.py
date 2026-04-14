from dataclasses import dataclass

import firebase_admin
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from firebase_admin import auth, credentials

from app.core.config import settings

bearer_scheme = HTTPBearer(auto_error=False)


@dataclass(frozen=True)
class FirebaseUser:
    uid: str
    email: str | None = None
    name: str | None = None
    picture: str | None = None


def get_firebase_app() -> firebase_admin.App:
    if firebase_admin._apps:
        return firebase_admin.get_app()

    if settings.firebase_credentials_path:
        credential = credentials.Certificate(settings.firebase_credentials_path)
    elif (
        settings.firebase_project_id
        and settings.firebase_client_email
        and settings.firebase_private_key
    ):
        private_key = settings.firebase_private_key.replace("\\n", "\n")
        credential = credentials.Certificate(
            {
                "type": "service_account",
                "project_id": settings.firebase_project_id,
                "client_email": settings.firebase_client_email,
                "private_key": private_key,
                "token_uri": "https://oauth2.googleapis.com/token",
            }
        )
    else:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Firebase Admin credentials are not configured.",
        )

    return firebase_admin.initialize_app(credential)


def get_current_firebase_user(
    credentials_value: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> FirebaseUser:
    if credentials_value is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing bearer token.",
        )

    get_firebase_app()

    try:
        decoded_token = auth.verify_id_token(credentials_value.credentials)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid bearer token.",
        ) from exc

    return FirebaseUser(
        uid=decoded_token["uid"],
        email=decoded_token.get("email"),
        name=decoded_token.get("name"),
        picture=decoded_token.get("picture"),
    )
