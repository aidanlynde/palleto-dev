from secrets import token_urlsafe

from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.models import Card, CardShare


def create_or_refresh_card_share(db: Session, card: Card) -> CardShare:
    share = db.query(CardShare).filter(CardShare.card_id == card.id).one_or_none()

    if share is None:
        share = CardShare(card_id=card.id, share_token=_share_token())
        db.add(share)
    else:
        share.share_token = _share_token()

    db.flush()

    return share


def build_share_url(share_token: str) -> str:
    base_url = settings.public_share_base_url or settings.public_api_base_url
    normalized_base_url = base_url.rstrip("/")
    return f"{normalized_base_url}/s/{share_token}"


def build_share_preview_image_url(share_token: str) -> str:
    base_url = settings.public_share_base_url or settings.public_api_base_url
    normalized_base_url = base_url.rstrip("/")
    return f"{normalized_base_url}/og/share/{share_token}.svg"


def _share_token() -> str:
    return token_urlsafe(9).replace("-", "").replace("_", "")[:12]
