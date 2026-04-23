import logging
from urllib.parse import quote
from uuid import uuid4

from fastapi import HTTPException, UploadFile, status
from firebase_admin import storage

from app.core.auth import get_firebase_app
from app.core.config import settings

logger = logging.getLogger(__name__)


async def upload_card_image(
    *,
    card_id: str,
    firebase_uid: str,
    image: UploadFile,
) -> tuple[str, str]:
    return await _upload_image(
        firebase_uid=firebase_uid,
        image=image,
        storage_path=f"users/{firebase_uid}/cards/{card_id}/original",
    )


async def upload_project_reference_image(
    *,
    firebase_uid: str,
    image: UploadFile,
) -> tuple[str, str]:
    return await _upload_image(
        firebase_uid=firebase_uid,
        image=image,
        storage_path=f"users/{firebase_uid}/project-context/{uuid4()}/reference",
    )


def delete_card_image(storage_path: str | None) -> None:
    if not storage_path or not settings.firebase_storage_bucket:
        return

    try:
        get_firebase_app()
        bucket = storage.bucket(settings.firebase_storage_bucket)
        bucket.blob(storage_path).delete()
    except Exception:
        logger.exception("Failed to delete card image from Firebase Storage")


def _extension_for_content_type(content_type: str) -> str:
    if content_type == "image/png":
        return ".png"
    if content_type in {"image/heic", "image/heif"}:
        return ".heic"
    return ".jpg"


async def _upload_image(
    *,
    firebase_uid: str,
    image: UploadFile,
    storage_path: str,
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
    full_storage_path = f"{storage_path}{extension}"
    token = str(uuid4())

    bucket = storage.bucket(settings.firebase_storage_bucket)
    blob = bucket.blob(full_storage_path)
    blob.metadata = {"firebaseStorageDownloadTokens": token}
    blob.upload_from_string(content, content_type=content_type)
    blob.patch()

    image_url = (
        f"https://firebasestorage.googleapis.com/v0/b/{bucket.name}/o/"
        f"{quote(full_storage_path, safe='')}?alt=media&token={token}"
    )

    return full_storage_path, image_url
