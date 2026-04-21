from app.db.models import Card


def serialize_card(card: Card) -> dict:
    return {
        "id": card.id,
        "image_url": card.image_url,
        "source_type": card.source_type,
        "title": card.title,
        "one_line_read": card.one_line_read,
        "creative_direction": card.creative_direction,
        "palette": card.palette,
        "visual_dna": card.visual_dna,
        "design_moves": card.design_moves,
        "project_lens": card.project_lens,
        "type_direction": card.type_direction,
        "search_language": card.search_language,
        "related_links": card.related_links,
        "created_at": card.created_at.isoformat(),
        "updated_at": card.updated_at.isoformat(),
    }
