from sqlalchemy.orm import Session

from app.db.models import TasteProfile, User
from app.schemas.taste_profile import OnboardingAnswersPayload, TasteProfileWrite


def get_taste_profile(db: Session, user: User) -> TasteProfile | None:
    return db.query(TasteProfile).filter(TasteProfile.user_id == user.id).one_or_none()


def upsert_taste_profile(db: Session, user: User, payload: TasteProfileWrite) -> TasteProfile:
    profile = get_taste_profile(db, user)

    if profile is None:
        profile = TasteProfile(user_id=user.id)
        db.add(profile)

    answers = payload.onboarding_answers
    profile.onboarding_answers = answers.model_dump()
    profile.work_for = _clean_list(answers.work_for)
    profile.extract_from_reference = _clean_list(answers.extract_from_reference)
    profile.useful_scan = _clean_list(answers.useful_scan)
    profile.lean_toward = _clean_list(answers.lean_toward)
    profile.avoid = _clean_list(answers.avoid)
    profile.summary = _build_summary(answers)

    db.flush()
    return profile


def _clean_list(values: list[str]) -> list[str]:
    return [value.strip() for value in values if value and value.strip()]


def _build_summary(answers: OnboardingAnswersPayload) -> str | None:
    parts: list[str] = []

    if answers.work_for:
        parts.append(f"Collecting most often for {', '.join(answers.work_for[:2]).lower()}.")
    if answers.extract_from_reference:
        parts.append(
            f"Usually wants to extract {', '.join(answers.extract_from_reference[:2]).lower()}."
        )
    if answers.lean_toward:
        parts.append(f"Leans toward {', '.join(answers.lean_toward[:2]).lower()}.")
    if answers.avoid:
        parts.append(f"Avoids {', '.join(answers.avoid[:2]).lower()}.")

    return " ".join(parts) or None
