import logging

from openai import OpenAI
from pydantic import BaseModel

from app.core.config import settings
from app.schemas.card import ProjectContextPayload
from app.services.card_generator import generate_card_payload
from app.services.link_preview import enrich_related_links

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
        return _fallback_payload(project_context)

    try:
        return _generate_with_openai(image_url=image_url, project_context=project_context)
    except Exception:
        logger.exception("OpenAI card generation failed; using placeholder generator")
        return _fallback_payload(project_context)


def refine_card_payload(
    *,
    image_url: str,
    base_card: dict,
    instruction: str,
    project_context: ProjectContextPayload | None,
) -> dict:
    if not settings.openai_api_key:
        return _fallback_refinement(base_card, instruction)

    try:
        return _refine_with_openai(
            image_url=image_url,
            base_card=base_card,
            instruction=instruction,
            project_context=project_context,
        )
    except Exception:
        logger.exception("OpenAI card refinement failed; using placeholder refinement")
        return _fallback_refinement(base_card, instruction)


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
    payload["related_links"] = enrich_related_links(
        _normalize_related_links(payload["related_links"])
    )

    return payload


def _refine_with_openai(
    *,
    image_url: str,
    base_card: dict,
    instruction: str,
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
                        "text": _refinement_system_prompt(),
                    }
                ],
            },
            {
                "role": "user",
                "content": [
                    {
                        "type": "input_text",
                        "text": (
                            "Refine this existing Palleto card for the same image. "
                            f"Project context JSON: {project_context_json}\n\n"
                            f"User instruction: {instruction}\n\n"
                            f"Current card JSON: {base_card}"
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
    payload["related_links"] = enrich_related_links(
        _normalize_related_links(payload["related_links"])
    )

    return payload


def _fallback_payload(project_context: ProjectContextPayload | None) -> dict:
    payload = generate_card_payload(project_context)
    payload["related_links"] = enrich_related_links(payload["related_links"])
    return payload


def _fallback_refinement(base_card: dict, instruction: str) -> dict:
    refined_card = dict(base_card)
    refined_card["creative_direction"] = (
        f"{base_card['creative_direction']} Refined direction: {instruction.strip()}."
    )
    refined_card["project_lens"] = {
        **base_card["project_lens"],
        "summary": f"{base_card['project_lens']['summary']} Refine it toward {instruction.strip().lower()}.",
        "applications": [
            f"{application} Push it toward {instruction.strip().lower()}."
            if index == 0
            else application
            for index, application in enumerate(base_card["project_lens"]["applications"])
        ],
    }
    refined_card["type_direction"] = [
        {
            "style": direction["style"],
            "use": f"{direction['use']} Tuned toward {instruction.strip().lower()}.",
        }
        for direction in base_card["type_direction"]
    ]
    return refined_card


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
- visual_dna.texture must describe the visible material surface: grain, weave, glaze, erosion, paper, fabric, shadow softness, organic marks, or construction evidence.
- visual_dna.shape_language must name concrete forms visible in the image: arcs, grids, borders, silhouettes, seams, blocks, loops, ornament, negative space, or edge behavior.
- visual_dna.contrast must describe the image's design contrast system: tonal mass, material contrast, scale contrast, saturated accent vs muted field, sharp vs soft, dense vs open.
- visual_dna.composition must describe how the image is organized: crop logic, field/figure relationship, repetition, alignment, depth, rhythm, or framing.
- project_lens.summary must be a strong "what to steal" takeaway: one clear creative idea a user can apply from this image.
- project_lens.applications must be concrete project-specific uses for the active project, not generic observations.
- When project context includes audience, desired feeling, avoid cues, or reference links, treat them as real constraints rather than loose flavor.
- Prioritize the project context in this order: project type and current goal, desired feeling, positive direction tags, avoid cues, then reference links.
- If the project context contains both positive and negative cues, resolve the output toward the positive cues while explicitly steering away from the negative ones.
- Type direction must respect the requested feeling and avoid list. If the context suggests organic, soft, handmade, editorial, or luxurious qualities, do not default to blocky utilitarian type unless the image evidence strongly demands that tension.
- Design moves must be short action lines that can support the translation, but avoid repeating project_lens.applications.
- Related links should be specific public webpages that are likely to unfurl with real link preview images: design articles, museum/archive pages, type foundries, brand case studies, editorial references, Are.na channels, Pinterest boards, or other stable inspiration pages.
- Avoid generic search-result URLs unless no specific page is credible.
- Do not invent thumbnail URLs. Use thumbnail_url null unless it is a real direct image URL from the source.
- Keep every text field concise enough for a mobile card.

Return only the structured card.
""".strip()


def _refinement_system_prompt() -> str:
    return """
You are Palleto, refining an existing inspiration card with the user.

Take the current card as the baseline. Do not restart from scratch unless the instruction clearly asks for a new angle.

Rules:
- Keep the refined output tied to the same image evidence.
- Respect the user's refinement instruction as a concrete change request.
- Preserve what is already strong in the card while making the requested shift obvious.
- Tighten project translation, type direction, and applications first when the user asks for a stylistic change.
- Do not bloat the amount of text. Make the refinement feel sharper, not longer.
- Keep related links credible and likely to unfurl with real preview images.

Return only the structured refined card.
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
