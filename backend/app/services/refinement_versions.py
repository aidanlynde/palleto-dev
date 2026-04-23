from app.db.models import Card, CardRefinement
from app.schemas.card import CardRefinementRead

SECTION_LABELS = {
    "creative_direction": "creative angle",
    "design_moves": "design moves",
    "one_line_read": "core read",
    "palette": "palette",
    "project_lens": "project applications",
    "related_links": "references",
    "search_language": "search language",
    "type_direction": "type direction",
    "visual_dna": "visual DNA",
}


def summarize_refinement(
    *,
    instruction: str,
    changed_sections: list[str],
) -> str:
    readable_sections = [
        SECTION_LABELS[section]
        for section in changed_sections
        if section in SECTION_LABELS
    ]

    if readable_sections:
        focus = ", ".join(readable_sections[:3])
        return f"{instruction.strip()} Updated {focus}."

    return f"{instruction.strip()} Updated the card direction."


def diff_changed_sections(
    *,
    base_card: dict,
    refined_card: dict,
) -> list[str]:
    tracked_sections = [
        "one_line_read",
        "creative_direction",
        "palette",
        "visual_dna",
        "design_moves",
        "project_lens",
        "type_direction",
        "search_language",
        "related_links",
    ]

    changed_sections: list[str] = []
    for section in tracked_sections:
        if base_card.get(section) != refined_card.get(section):
            changed_sections.append(section)

    return changed_sections


def serialize_refinement_read(
    *,
    card: Card,
    refinement: CardRefinement,
    refinements: list[CardRefinement],
) -> CardRefinementRead:
    version_index = refinements.index(refinement) + 1
    label = refinement.preset_label or f"Refine {version_index}"

    return CardRefinementRead(
        id=refinement.id,
        card_id=refinement.card_id,
        based_on_refinement_id=refinement.based_on_refinement_id,
        changed_sections=refinement.changed_sections or [],
        label=label,
        summary=refinement.summary,
        preset_label=refinement.preset_label,
        instruction=refinement.instruction,
        version_index=version_index,
        refined_card={
            **refinement.refined_card,
            "id": card.id,
            "image_url": card.image_url,
            "source_type": card.source_type,
            "created_at": card.created_at.isoformat(),
            "updated_at": card.updated_at.isoformat(),
        },
        created_at=refinement.created_at,
        updated_at=refinement.updated_at,
    )
