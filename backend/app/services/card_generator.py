from app.schemas.card import ProjectContextPayload


def generate_card_payload(project_context: ProjectContextPayload | None) -> dict:
    project_type = project_context.projectType if project_context else None
    project_type = project_type or "Creative direction"
    priorities = project_context.priorities if project_context else []
    direction_tags = project_context.directionTags if project_context else []
    audience = project_context.audience if project_context else None
    desired_feeling = project_context.desiredFeeling if project_context else None
    avoid = project_context.avoid if project_context else None
    reference_links = project_context.referenceLinks if project_context else []

    project_summary = _project_summary(
        project_type,
        priorities,
        direction_tags,
        audience,
        desired_feeling,
    )

    return {
        "title": "Street Koi Signal",
        "one_line_read": (
            "A street-found graphic system built from pavement grit, animal symbolism, "
            "and one sharp orange interruption."
        ),
        "creative_direction": (
            "This reference works because it turns an ordinary sidewalk into a graphic mark. "
            "The koi forms feel symbolic and handmade, while the black, white, and orange palette "
            "gives the image instant poster energy. Use this direction when you want something "
            "urban, tactile, and expressive without becoming messy."
        ),
        "palette": [
            {"hex": "#F26A21", "label": "Signal orange", "role": "accent"},
            {"hex": "#111111", "label": "Tar black", "role": "anchor"},
            {"hex": "#F4F1EA", "label": "Chalk white", "role": "relief"},
            {"hex": "#67675F", "label": "Weathered concrete", "role": "field"},
            {"hex": "#2D2F2A", "label": "Soft shadow", "role": "depth"},
        ],
        "visual_dna": {
            "contrast": "Hard black and white separation with one saturated orange interruption.",
            "shape_language": "Organic koi silhouettes, tapered motion, stencil-like edge behavior.",
            "texture": "Rough pavement grain, sprayed pigment, chalky wear, soft outdoor shadow.",
            "composition": (
                "Two offset forms create diagonal movement and a quiet negative-space tension."
            ),
        },
        "design_moves": [
            "Use one saturated accent as the entire emotional charge.",
            "Let rough surface texture stay visible instead of over-cleaning the mark.",
            "Build movement through diagonal placement rather than extra decoration.",
            "Pair organic illustration with severe typography for tension.",
            "Keep imperfect edges so the system feels found, not manufactured.",
        ],
        "project_lens": {
            "project_type": project_type,
            "summary": project_summary,
            "applications": _applications_for_project(
                project_type,
                desired_feeling=desired_feeling,
                avoid=avoid,
            ),
        },
        "type_direction": _type_directions(direction_tags, desired_feeling, avoid),
        "search_language": [
            "koi symbolism",
            "urban stencil",
            "signal orange identity",
            "pavement texture",
            "high contrast street mark",
            "Japanese fish motif",
        ],
        "related_links": related_inspiration_links(reference_links),
    }


def related_inspiration_links(reference_links: list[str]) -> list[dict]:
    if reference_links:
        seeded_links = [
            {
                "provider": "project reference",
                "reason": "Seeded from your active project references.",
                "thumbnail_url": None,
                "title": reference_link,
                "url": reference_link,
            }
            for reference_link in reference_links[:2]
        ]
    else:
        seeded_links = []

    return [
        *seeded_links,
        {
            "provider": "placeholder",
            "reason": "A search lane for rough public marks, stencil edges, and found graphic systems.",
            "thumbnail_url": None,
            "title": "Are.na query: urban stencil marks",
            "url": "https://www.are.na/search?q=urban%20stencil%20marks",
        },
        {
            "provider": "placeholder",
            "reason": "Useful for seeing how koi symbolism gets translated into identity and surface graphics.",
            "thumbnail_url": None,
            "title": "Pinterest query: koi graphic identity",
            "url": "https://www.pinterest.com/search/pins/?q=koi%20graphic%20identity",
        },
    ][:4]


def _project_summary(
    project_type: str,
    priorities: list[str],
    direction_tags: list[str],
    audience: str | None,
    desired_feeling: str | None,
) -> str:
    priority_text = ", ".join(priorities[:3]) if priorities else "visual direction"
    direction_text = ", ".join(direction_tags[:3]).lower() if direction_tags else "focused"
    audience_text = f" for {audience}" if audience else ""
    feeling_text = f" that feels {desired_feeling.lower()}" if desired_feeling else ""

    return (
        f"For this {project_type.lower()}{audience_text}, read the reference through "
        f"{direction_text} cues, prioritize {priority_text.lower()}, and push it toward "
        f"a direction{feeling_text}."
    )


def _applications_for_project(
    project_type: str,
    *,
    desired_feeling: str | None,
    avoid: str | None,
) -> list[str]:
    applications_by_project = {
        "Clothing brand": [
            "Use the koi as a recurring drop symbol instead of a full logo.",
            "Pull the orange into stitching, hang tags, and limited-run packaging.",
            "Keep pavement texture as campaign backdrop and pair it with strict type.",
        ],
        "Brand identity": [
            "Build a mascot-adjacent mark system with one aggressive accent color.",
            "Use rough pavement crops for launch graphics, stickers, and hang tags.",
            "Keep the symbol handmade while making typography severe and structured.",
        ],
        "Packaging": [
            "Translate the koi into stamped seals, box tape, and label closures.",
            "Use matte concrete-gray substrates with black illustration and white utility type.",
            "Make the orange accent feel like a limited-run recognition system.",
        ],
        "Campaign": [
            "Use diagonal motion and high-contrast animal symbolism for hero art.",
            "Let one color carry the entire visual charge across placements.",
            "Treat pavement texture as a recurring campaign surface.",
        ],
    }

    applications = applications_by_project.get(
        project_type,
        [
            "Use this as a compact visual system built from one motif, one accent, and one texture.",
            "Make rough surface texture feel intentional instead of incidental.",
            "Apply the reference to marks, layouts, packaging, or campaign openers.",
        ],
    )

    if desired_feeling:
        applications[0] = f"{applications[0]} Keep the execution tuned toward {desired_feeling.lower()}."

    if avoid:
        applications[-1] = f"{applications[-1]} Avoid drifting into {avoid.lower()}."

    return applications


def _type_directions(
    direction_tags: list[str],
    desired_feeling: str | None,
    avoid: str | None,
) -> list[dict]:
    direction_text = " ".join(direction_tags).lower()
    feeling_text = (desired_feeling or "").lower()
    avoid_text = (avoid or "").lower()
    context = " ".join([direction_text, feeling_text])

    if any(keyword in context for keyword in ["organic", "hand-touched", "editorial", "luxury", "soft"]):
        return [
            {
                "style": "Soft editorial serif",
                "use": "For brand signatures, hero headlines, and cultured framing with more warmth than severity.",
            },
            {
                "style": "Humanist sans",
                "use": "For product names and supporting hierarchy that still feels shaped by the hand.",
            },
            {
                "style": "Refined italic accent",
                "use": "For notes, story text, or seasonal language that adds movement without going ornamental.",
            },
        ]

    if any(keyword in context for keyword in ["technical", "precise", "industrial", "minimal"]):
        return [
            {
                "style": "Structured neo-grotesk",
                "use": "For headlines and product naming where the system needs clarity and compression.",
            },
            {
                "style": "Utility mono",
                "use": "For specs, captions, and archive language that should feel deliberate and exact.",
            },
            {
                "style": "Narrow grotesk",
                "use": "For secondary hierarchy when you want precision without looking cold.",
            },
        ]

    base_directions = [
        {
            "style": "Compressed grotesk",
            "use": "For street-poster urgency, product names, and campaign headlines.",
        },
        {
            "style": "Ink-trap sans",
            "use": "For sharper cultural edge without losing legibility.",
        },
        {
            "style": "Utility mono",
            "use": "For captions, archive labels, specs, and drop information.",
        },
    ]

    if "blocky" in avoid_text or "utilitarian" in avoid_text:
        base_directions[2] = {
            "style": "Calligraphic sans accent",
            "use": "For captions or side notes that keep the system lively without falling back to a hard utilitarian voice.",
        }

    return base_directions
