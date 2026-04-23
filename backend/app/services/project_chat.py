import logging
import re

from openai import OpenAI
from pydantic import BaseModel

from app.core.config import settings
from app.db.models import ActiveProject, TasteProfile
from app.schemas.project_chat import ProjectBriefDraft, ProjectChatRequest, ProjectChatResponse

logger = logging.getLogger(__name__)


class _ProjectChatResult(BaseModel):
    assistant_message: str
    suggested_replies: list[str]
    draft: ProjectBriefDraft
    brief_summary: str
    missing_fields: list[str]
    is_ready_to_save: bool


def build_project_chat_response(
    *,
    active_project: ActiveProject | None,
    taste_profile: TasteProfile | None,
    payload: ProjectChatRequest,
) -> ProjectChatResponse:
    initial_draft = _merge_draft(active_project, payload)

    if settings.openai_api_key:
        try:
            return _chat_with_openai(
                active_project=active_project,
                taste_profile=taste_profile,
                payload=payload,
                initial_draft=initial_draft,
            )
        except Exception:
            logger.exception("Project chat generation failed; using fallback flow")

    return _fallback_chat_response(
        taste_profile=taste_profile,
        payload=payload,
        draft=initial_draft,
    )


def _chat_with_openai(
    *,
    active_project: ActiveProject | None,
    taste_profile: TasteProfile | None,
    payload: ProjectChatRequest,
    initial_draft: ProjectBriefDraft,
) -> ProjectChatResponse:
    client = OpenAI(api_key=settings.openai_api_key)

    response = client.responses.parse(
        model=settings.openai_model,
        input=[
            {
                "role": "system",
                "content": [
                    {
                        "type": "input_text",
                        "text": _system_prompt(),
                    }
                ],
            },
            {
                "role": "user",
                "content": [
                    {
                        "type": "input_text",
                        "text": (
                            f"Current taste profile JSON: {_taste_profile_json(taste_profile)}\n\n"
                            f"Current saved active project JSON: {_active_project_json(active_project)}\n\n"
                            f"Conversation history JSON: {[message.model_dump() for message in payload.history]}\n\n"
                            f"Latest user message: {payload.message or ''}\n\n"
                            f"Current draft JSON: {initial_draft.model_dump()}\n\n"
                            f"Reference links added this turn: {payload.reference_links}\n\n"
                            f"Reference images added this turn: {payload.reference_images}"
                        ),
                    }
                ],
            },
        ],
        text_format=_ProjectChatResult,
    )

    parsed = response.output_parsed
    result = parsed.model_copy(update={"draft": _normalize_draft(parsed.draft)})
    return ProjectChatResponse.model_validate(result.model_dump())


def _fallback_chat_response(
    *,
    taste_profile: TasteProfile | None,
    payload: ProjectChatRequest,
    draft: ProjectBriefDraft,
) -> ProjectChatResponse:
    normalized_draft = _normalize_draft(draft)
    missing_fields = _missing_fields(normalized_draft)

    if not payload.history and not payload.message:
        assistant_message = (
            "I already have your onboarding taste profile. Tell me what you are building right now, "
            "or drop in a link/image that defines the world you want."
        )
        suggested = [
            "I’m building a clothing brand around racing graphics and city signage.",
            "I want this to feel softer and more editorial than corporate.",
            "Here’s a reference link that defines the world."
        ]
    elif missing_fields:
        next_field = missing_fields[0]
        assistant_message = _question_for_missing_field(next_field, taste_profile)
        suggested = _suggestions_for_missing_field(next_field)
    else:
        assistant_message = (
            "This brief is in good shape. You can save it now or keep refining with another detail, "
            "link, or reference image."
        )
        suggested = [
            "Save this project context",
            "Add another reference link",
            "Tighten the audience and desired feel"
        ]

    return ProjectChatResponse(
        assistant_message=assistant_message,
        suggested_replies=suggested,
        draft=normalized_draft,
        brief_summary=_brief_summary(normalized_draft, taste_profile),
        missing_fields=missing_fields,
        is_ready_to_save=len(missing_fields) == 0,
    )


def _merge_draft(
    active_project: ActiveProject | None,
    payload: ProjectChatRequest,
) -> ProjectBriefDraft:
    base = ProjectBriefDraft(
        name=active_project.name if active_project else None,
        description=active_project.description if active_project else None,
        project_type=active_project.project_type if active_project else None,
        audience=active_project.audience if active_project else None,
        desired_feeling=active_project.desired_feeling if active_project else None,
        avoid=active_project.avoid if active_project else None,
        direction_tags=active_project.direction_tags if active_project else [],
        priorities=active_project.priorities if active_project else [],
        reference_links=active_project.reference_links if active_project else [],
        reference_images=active_project.reference_images if active_project else [],
    )

    if payload.draft is not None:
        base = payload.draft

    draft = base.model_copy(deep=True)

    links_from_message = _extract_urls(payload.message or "")
    draft.reference_links = _merge_unique(draft.reference_links, payload.reference_links, links_from_message)
    draft.reference_images = _merge_unique(draft.reference_images, payload.reference_images)

    return _normalize_draft(draft)


def _normalize_draft(draft: ProjectBriefDraft) -> ProjectBriefDraft:
    normalized = draft.model_copy(deep=True)
    normalized.name = _text(normalized.name)
    normalized.description = _text(normalized.description)
    normalized.project_type = _text(normalized.project_type)
    normalized.audience = _text(normalized.audience)
    normalized.desired_feeling = _text(normalized.desired_feeling)
    normalized.avoid = _text(normalized.avoid)
    normalized.direction_tags = _clean_list(normalized.direction_tags)
    normalized.priorities = _clean_list(normalized.priorities)
    normalized.reference_links = _clean_list(normalized.reference_links)
    normalized.reference_images = _clean_list(normalized.reference_images)
    return normalized


def _missing_fields(draft: ProjectBriefDraft) -> list[str]:
    missing: list[str] = []
    if not draft.description:
        missing.append("description")
    if not draft.project_type:
        missing.append("project_type")
    if not draft.desired_feeling:
        missing.append("desired_feeling")
    return missing


def _brief_summary(draft: ProjectBriefDraft, taste_profile: TasteProfile | None) -> str:
    parts: list[str] = []
    if draft.project_type:
        parts.append(draft.project_type)
    if draft.name:
        parts.append(draft.name)
    if draft.desired_feeling:
        parts.append(f"should feel {draft.desired_feeling.lower()}")
    if taste_profile and taste_profile.summary:
        parts.append(f"Taste profile: {taste_profile.summary}")
    return " • ".join(parts) or "Start describing what you are building."


def _question_for_missing_field(field: str, taste_profile: TasteProfile | None) -> str:
    if field == "description":
        return "What are you actually building right now? Give me the project in plain language."
    if field == "project_type":
        return "What kind of project is this: brand, clothing line, campaign, product, interior, or something else?"
    if field == "desired_feeling":
        lean = ", ".join((taste_profile.lean_toward if taste_profile else [])[:2]).lower()
        if lean:
            return f"What should this feel like when it is dialed? You usually lean toward {lean}."
        return "What should this feel like when it is dialed?"
    return "Tell me the next detail that sharpens this project."


def _suggestions_for_missing_field(field: str) -> list[str]:
    mapping = {
        "description": [
            "A clothing brand built around racing graphics and worn technical gear.",
            "A hospitality identity that feels handmade, cultured, and a little ceremonial.",
            "A campaign world for a launch that needs stronger visual references."
        ],
        "project_type": ["Clothing brand", "Brand identity", "Campaign"],
        "desired_feeling": [
            "Softer and more editorial than corporate.",
            "Quiet luxury with visible hand-touched texture.",
            "Technical, sharp, and more collectible than generic."
        ],
    }
    return mapping.get(field, ["Add another detail", "Paste a link", "Upload a reference image"])


def _system_prompt() -> str:
    return """
You are Palleto's project brief builder.

Your job is to help a creative turn messy project thoughts into a clean structured brief that the rest of the app can use.

Rules:
- This should feel like an intelligent collaborator, not a form.
- Ask only the next most useful question.
- Accept links and reference-image URLs as real project signals.
- Do not repeat the same question in different wording.
- Use the taste profile as prior context, not as script text to parrot back.
- Update the draft conservatively: preserve strong existing fields, refine unclear ones, append new references.
- brief_summary should read like a concise working brief, not a survey recap.
- is_ready_to_save should only be true when description, project_type, and desired_feeling are all present.
- suggested_replies should be short, specific, and help the user move quickly.
""".strip()


def _taste_profile_json(taste_profile: TasteProfile | None) -> dict:
    if taste_profile is None:
        return {}
    return {
        "work_for": taste_profile.work_for,
        "extract_from_reference": taste_profile.extract_from_reference,
        "useful_scan": taste_profile.useful_scan,
        "lean_toward": taste_profile.lean_toward,
        "avoid": taste_profile.avoid,
        "summary": taste_profile.summary,
    }


def _active_project_json(active_project: ActiveProject | None) -> dict:
    if active_project is None:
        return {}
    return {
        "name": active_project.name,
        "description": active_project.description,
        "project_type": active_project.project_type,
        "audience": active_project.audience,
        "desired_feeling": active_project.desired_feeling,
        "avoid": active_project.avoid,
        "direction_tags": active_project.direction_tags,
        "priorities": active_project.priorities,
        "reference_links": active_project.reference_links,
        "reference_images": active_project.reference_images,
    }


def _extract_urls(text: str) -> list[str]:
    return re.findall(r"https?://[^\s]+", text)


def _merge_unique(*value_groups: list[str]) -> list[str]:
    seen: set[str] = set()
    merged: list[str] = []
    for values in value_groups:
        for value in values:
            normalized = value.strip()
            if normalized and normalized not in seen:
                seen.add(normalized)
                merged.append(normalized)
    return merged


def _clean_list(values: list[str]) -> list[str]:
    return [value.strip() for value in values if value and value.strip()]


def _text(value: str | None) -> str | None:
    if value is None:
        return None
    normalized = value.strip()
    return normalized or None
