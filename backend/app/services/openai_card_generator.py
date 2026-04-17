import logging

from openai import OpenAI
from pydantic import BaseModel

from app.core.config import settings
from app.schemas.card import ProjectContextPayload
from app.services.card_generator import generate_card_payload

logger = logging.getLogger(__name__)


class GeneratedPaletteColor(BaseModel):
    hex: str
    label: str
    role: str


class GeneratedVisualDna(BaseModel):
    composition: str
    contrast: str
    shape_language: str
    texture: str


class GeneratedProjectLens(BaseModel):
    applications: list[str]
    project_type: str
    summary: str


class GeneratedTypeDirection(BaseModel):
    style: str
    use: str


class GeneratedRelatedLink(BaseModel):
    provider: str
    reason: str | None
    thumbnail_url: str | None
    title: str
    url: str


class GeneratedCardPayload(BaseModel):
    title: str
    one_line_read: str
    creative_direction: str
    palette: list[GeneratedPaletteColor]
    visual_dna: GeneratedVisualDna
    design_moves: list[str]
    project_lens: GeneratedProjectLens
    type_direction: list[GeneratedTypeDirection]
    search_language: list[str]
    related_links: list[GeneratedRelatedLink]


def generate_card_payload_for_image(
    *,
    image_url: str,
    project_context: ProjectContextPayload | None,
) -> dict:
    if not settings.openai_api_key:
        return generate_card_payload(project_context)

    try:
        return _generate_with_openai(image_url=image_url, project_context=project_context)
    except Exception:
        logger.exception("OpenAI card generation failed; using placeholder generator")
        return generate_card_payload(project_context)


def _generate_with_openai(
    *,
    image_url: str,
    project_context: ProjectContextPayload | None,
) -> dict:
    client = OpenAI(api_key=settings.openai_api_key)
    project_context_json = (
        project_context.model_dump_json(exclude_none=True) if project_context else "{}"
    )

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
                            "Analyze this real-world inspiration image and generate a premium "
                            "Palleto inspiration card. Use this project context JSON: "
                            f"{project_context_json}"
                        ),
                    },
                    {
                        "type": "input_image",
                        "image_url": image_url,
                        "detail": "high",
                    },
                ],
            },
        ],
        text_format=GeneratedCardPayload,
    )

    parsed = response.output_parsed
    payload = parsed.model_dump()
    payload["related_links"] = _normalize_related_links(payload["related_links"])

    return payload


def _system_prompt() -> str:
    return """
You are Palleto, a tasteful visual research assistant for creatives.

Your job is to transform one real-world image into a useful creative-direction card.
Write for designers, founders, art directors, stylists, and creative operators building real projects.

Rules:
- Be specific to visible evidence in the image.
- Make the output usable, not merely descriptive.
- Connect observations to creative applications.
- Use confident editorial language, but avoid vague filler.
- Avoid generic words like modern, cool, aesthetic, beautiful, premium, edgy, or bold unless you explain the visual reason.
- Palette colors must be plausible visible colors from the image.
- Design moves must be concrete actions a creative could apply.
- Project lens must adapt to the provided project context.
- Related links should be useful search URLs from Are.na, Pinterest, Google Images, or other public inspiration surfaces. Use thumbnail_url null unless you know a direct image thumbnail.
- Keep every text field concise enough for a mobile card.

Return only the structured card.
""".strip()


def _normalize_related_links(links: list[dict]) -> list[dict]:
    normalized_links = []

    for link in links[:4]:
        title = link.get("title") or "Related inspiration"
        provider = link.get("provider") or "placeholder"
        url = link.get("url") or _search_url(title)

        normalized_links.append(
            {
                "provider": provider,
                "reason": link.get("reason"),
                "thumbnail_url": link.get("thumbnail_url"),
                "title": title,
                "url": url,
            }
        )

    if normalized_links:
        return normalized_links

    return [
        {
            "provider": "Google Images",
            "reason": "A visual search lane based on the generated card language.",
            "thumbnail_url": None,
            "title": "Search this visual direction",
            "url": _search_url("visual inspiration design texture palette"),
        }
    ]


def _search_url(query: str) -> str:
    from urllib.parse import quote

    return f"https://www.google.com/search?tbm=isch&q={quote(query)}"
