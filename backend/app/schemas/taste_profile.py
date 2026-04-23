from datetime import datetime

from pydantic import BaseModel, ConfigDict


class OnboardingAnswersPayload(BaseModel):
    avoid: list[str] = []
    extract_from_reference: list[str] = []
    lean_toward: list[str] = []
    useful_scan: list[str] = []
    work_for: list[str] = []


class TasteProfileWrite(BaseModel):
    onboarding_answers: OnboardingAnswersPayload


class TasteProfileRead(BaseModel):
    id: str
    onboarding_answers: OnboardingAnswersPayload
    work_for: list[str]
    extract_from_reference: list[str]
    useful_scan: list[str]
    lean_toward: list[str]
    avoid: list[str]
    summary: str | None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
