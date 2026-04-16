from urllib.parse import quote
from uuid import uuid4

from fastapi import HTTPException, UploadFile, status
from firebase_admin import storage

from app.core.auth import get_firebase_app
from app.core.config import settings


async def upload_card_image(
    *,
    card_id: str,
    firebase_uid: str,
    image: UploadFile,
) -> tuple[str, str]:
    if not settings.firebase_storage_bucket:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Firebase Storage bucket is not configured.",
        )

    get_firebase_app()

    content = await image.read()
    if not content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded image is empty.",
        )

    content_type = image.content_type or "image/jpeg"
    extension = _extension_for_content_type(content_type)
    storage_path = f"users/{firebase_uid}/cards/{card_id}/original{extension}"
    token = str(uuid4())

    bucket = storage.bucket(settings.firebase_storage_bucket)
    blob = bucket.blob(storage_path)
    blob.metadata = {"firebaseStorageDownloadTokens": token}
    blob.upload_from_string(content, content_type=content_type)
    blob.patch()

    image_url = (
        f"https://firebasestorage.googleapis.com/v0/b/{bucket.name}/o/"
        f"{quote(storage_path, safe='')}?alt=media&token={token}"
    )

    return storage_path, image_url


def _extension_for_content_type(content_type: str) -> str:
    if content_type == "image/png":
        return ".png"
    if content_type in {"image/heic", "image/heif"}:
        return ".heic"
    return ".jpg"
