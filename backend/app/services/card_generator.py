from io import BytesIO

import httpx
from PIL import Image, ImageStat

from app.schemas.card import ProjectContextPayload


FALLBACK_IMAGE_TIMEOUT_SECONDS = 8.0
FALLBACK_PALETTE_ROLES = ["anchor", "field", "relief", "accent", "depth"]


def generate_image_aware_card_payload(
    image_url: str,
    project_context: ProjectContextPayload | None,
) -> dict:
    try:
        image = _load_image(image_url)
        palette = _extract_palette(image)
        orientation = _orientation_label(image)
        tone = _tone_label(image)
        contrast = _contrast_label(image)
    except Exception:
        return generate_card_payload(project_context)

    project_type = project_context.projectType if project_context else None
    project_type = project_type or "Creative direction"
    project_summary = _project_summary(
        project_type,
        project_context.priorities if project_context else [],
        project_context.directionTags if project_context else [],
        project_context.audience if project_context else None,
        project_context.desiredFeeling if project_context else None,
    )

    color_names = ", ".join(color["label"].lower() for color in palette[:3])
    return {
        "title": _image_derived_title(orientation, tone, color_names),
        "one_line_read": (
            f"A real-world reference translated from its {orientation} crop, "
            f"{tone} color temperature, and {color_names} palette."
        ),
        "creative_direction": (
            "This card was built from the uploaded image rather than the demo reference. "
            "Use the extracted palette, crop behavior, and contrast system as the starting "
            "point, then let the project context decide whether the reference becomes a "
            "brand mark, campaign surface, packaging language, or mood system."
        ),
        "palette": palette,
        "visual_dna": {
            "contrast": contrast,
            "shape_language": (
                "Use the dominant color fields and visible edge relationships as the shape system."
            ),
            "texture": (
                "Treat the source image's surface, light falloff, and capture grain as reusable texture cues."
            ),
            "composition": (
                f"The {orientation} frame gives the reference its first read; preserve that crop logic "
                "when translating it into layouts or assets."
            ),
        },
        "design_moves": [
            "Start with the extracted palette before adding new colors.",
            "Preserve the image's strongest light-to-dark relationship.",
            "Turn the main crop into a repeatable layout rule.",
            "Use one color as the recognition cue across small surfaces.",
            "Keep the translation close enough that the original reference remains legible.",
        ],
        "project_lens": {
            "project_type": project_type,
            "summary": project_summary,
            "applications": _applications_for_project(
                project_type,
                desired_feeling=project_context.desiredFeeling if project_context else None,
                avoid=project_context.avoid if project_context else None,
            ),
        },
        "type_direction": _type_directions(
            project_context.directionTags if project_context else [],
            project_context.desiredFeeling if project_context else None,
            project_context.avoid if project_context else None,
        ),
        "search_language": [
            "image-sourced palette",
            f"{tone} visual direction",
            f"{orientation} composition",
            "real-world reference system",
            "color extraction design",
        ],
        "related_links": related_inspiration_links(
            project_context.referenceLinks if project_context else []
        ),
    }


def generate_card_payload(project_context: ProjectContextPayload | None) -> dict:
    project_type = project_context.projectType if project_context else None
    project_type = project_type or "Creative direction"
    priorities = project_context.priorities if project_context else []
    direction_tags = project_context.directionTags if project_context else []
    audience = project_context.audience if project_context else None
    desired_feeling = project_context.desiredFeeling if project_context else None
    avoid = project_context.avoid if project_context else None
    reference_links = project_context.referenceLinks if project_context else []
    taste_extract = project_context.tasteProfileExtractFromReference if project_context else []
    taste_lean = project_context.tasteProfileLeanToward if project_context else []
    taste_avoid = project_context.tasteProfileAvoid if project_context else []

    project_summary = _project_summary(
        project_type,
        priorities or taste_extract,
        direction_tags or taste_lean,
        audience,
        desired_feeling,
    )

    return {
        "title": "Reference scan",
        "one_line_read": (
            "A real-world reference translated into palette, texture, composition, "
            "and practical creative direction."
        ),
        "creative_direction": (
            "Use this fallback direction as a neutral visual brief when full AI analysis is unavailable. "
            "Keep the translation grounded in the captured image: pull the strongest color relationship, "
            "preserve the crop logic, and turn the most recognizable surface or motif into a repeatable "
            "design rule."
        ),
        "palette": [
            {"hex": "#1F2328", "label": "Deep anchor", "role": "anchor"},
            {"hex": "#E8E3D8", "label": "Soft relief", "role": "relief"},
            {"hex": "#8A8276", "label": "Muted field", "role": "field"},
            {"hex": "#C06B3E", "label": "Warm signal", "role": "accent"},
            {"hex": "#545B60", "label": "Quiet depth", "role": "depth"},
        ],
        "visual_dna": {
            "contrast": "A practical light-to-dark system with one color allowed to carry recognition.",
            "shape_language": "Source-led forms, crop edges, negative space, and repeatable visual boundaries.",
            "texture": "Use the visible material, surface, shadow softness, and capture grain as design cues.",
            "composition": (
                "Let the original crop define hierarchy before adding secondary layout structure."
            ),
        },
        "design_moves": [
            "Extract the palette first, then decide what each color is allowed to do.",
            "Turn the strongest crop or motif into a repeatable layout rule.",
            "Let one accent carry recognition across small surfaces.",
            "Keep source texture visible where it adds proof and specificity.",
            "Pair the reference with type that sharpens the project context.",
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
        "type_direction": _type_directions(
            direction_tags or taste_lean,
            desired_feeling,
            " ".join(filter(None, [avoid, ", ".join(taste_avoid)])) or None,
        ),
        "search_language": [
            "image-sourced palette",
            "real-world visual reference",
            "found color system",
            "texture-led identity",
            "composition study",
            "creative direction reference",
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
            "reason": "A search lane for found references, source-led palettes, and visual systems.",
            "thumbnail_url": None,
            "title": "Are.na query: visual reference system",
            "url": "https://www.are.na/search?q=visual%20reference%20system",
        },
        {
            "provider": "placeholder",
            "reason": "Useful for seeing how captured color becomes brand, campaign, and layout direction.",
            "thumbnail_url": None,
            "title": "Pinterest query: color palette brand inspiration",
            "url": "https://www.pinterest.com/search/pins/?q=color%20palette%20brand%20inspiration",
        },
    ][:4]


def _load_image(image_url: str) -> Image.Image:
    response = httpx.get(image_url, timeout=FALLBACK_IMAGE_TIMEOUT_SECONDS)
    response.raise_for_status()
    return Image.open(BytesIO(response.content)).convert("RGB")


def _extract_palette(image: Image.Image) -> list[dict]:
    swatch = image.copy()
    swatch.thumbnail((180, 180))
    quantized = swatch.quantize(colors=8)
    palette = quantized.getpalette() or []
    color_counts = quantized.getcolors(maxcolors=180 * 180) or []

    colors: list[tuple[int, int, int]] = []
    for _, palette_index in sorted(color_counts, reverse=True):
        offset = palette_index * 3
        rgb = tuple(palette[offset : offset + 3])
        if len(rgb) != 3 or _too_similar(rgb, colors):
            continue
        colors.append(rgb)
        if len(colors) == 5:
            break

    while len(colors) < 5:
        colors.append((40 + len(colors) * 35, 44 + len(colors) * 30, 48 + len(colors) * 24))

    return [
        {
            "hex": _hex_color(rgb),
            "label": _color_label(rgb),
            "role": FALLBACK_PALETTE_ROLES[index],
        }
        for index, rgb in enumerate(colors[:5])
    ]


def _too_similar(rgb: tuple[int, int, int], existing_colors: list[tuple[int, int, int]]) -> bool:
    return any(sum(abs(channel - other_channel) for channel, other_channel in zip(rgb, color)) < 42 for color in existing_colors)


def _hex_color(rgb: tuple[int, int, int]) -> str:
    return f"#{rgb[0]:02X}{rgb[1]:02X}{rgb[2]:02X}"


def _color_label(rgb: tuple[int, int, int]) -> str:
    red, green, blue = rgb
    highest = max(rgb)
    lowest = min(rgb)
    luminance = (0.2126 * red) + (0.7152 * green) + (0.0722 * blue)

    if highest - lowest < 18:
        if luminance < 70:
            return "Deep neutral"
        if luminance > 190:
            return "Pale neutral"
        return "Muted neutral"
    if red >= green and red >= blue:
        return "Warm signal" if green > blue else "Red signal"
    if green >= red and green >= blue:
        return "Green field" if red < 130 else "Earth field"
    return "Blue shadow"


def _orientation_label(image: Image.Image) -> str:
    width, height = image.size
    if width > height * 1.15:
        return "wide"
    if height > width * 1.15:
        return "vertical"
    return "balanced"


def _tone_label(image: Image.Image) -> str:
    stat = ImageStat.Stat(image.resize((32, 32)))
    red, green, blue = stat.mean[:3]
    warmth = red - blue
    if warmth > 16:
        return "warm"
    if warmth < -16:
        return "cool"
    if max(red, green, blue) < 86:
        return "low-light"
    return "neutral"


def _contrast_label(image: Image.Image) -> str:
    grayscale = image.convert("L").resize((64, 64))
    stat = ImageStat.Stat(grayscale)
    spread = stat.stddev[0]
    if spread > 58:
        return "High tonal separation with enough shadow and highlight spread to support strong hierarchy."
    if spread > 32:
        return "Moderate tonal contrast that can become a calm hierarchy system with one stronger accent."
    return "Low tonal contrast with a softer field that needs type, spacing, or one accent to create hierarchy."


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


def _image_derived_title(orientation: str, tone: str, color_names: str) -> str:
    first_color = color_names.split(",")[0].strip() if color_names else "muted"
    orientation_label = {"wide": "wide-format", "vertical": "vertical", "balanced": "square"}.get(
        orientation, orientation
    )
    return f"{tone.capitalize()} {orientation_label} reference — {first_color}"


def _applications_for_project(
    project_type: str,
    *,
    desired_feeling: str | None,
    avoid: str | None,
) -> list[str]:
    applications_by_project: dict[str, list[str]] = {
        "Clothing brand": [
            "Pull the dominant color into stitching details, hang tags, and limited-run packaging.",
            "Use the texture or surface quality as a recurring campaign backdrop.",
            "Extract one recognizable motif or crop as a drop graphic or label seal.",
        ],
        "Brand identity": [
            "Build a compact color system anchored by the two strongest tones in the reference.",
            "Use the surface texture or material quality to define the brand's tactile language.",
            "Translate the composition logic into a repeatable layout grid or mark proportion.",
        ],
        "Packaging": [
            "Use the primary palette as substrate color — matte or gloss to match the surface feel.",
            "Pull one accent color for closures, seals, or label details that unify the range.",
            "Apply the texture reference to dielines or emboss patterns for tactile consistency.",
        ],
        "Campaign": [
            "Use the dominant color as the single visual charge across all placements.",
            "Build hero art from the image's most graphic crop or highest-contrast moment.",
            "Repeat the composition rule — horizon line, center weight, or edge behavior — across formats.",
        ],
        "Interior concept": [
            "Use the palette as a material specification: which tone goes on walls, trim, and accents.",
            "Extract the texture family — rough, smooth, woven, glazed — as a finish selection guide.",
            "Apply the composition's depth cues (layer, frame, foreground/background) to spatial hierarchy.",
        ],
        "Product design": [
            "Use the accent color as the primary finish or CMF callout for the hero surface.",
            "Extract the material quality — grain, matte, translucent — as a form language signal.",
            "Apply the composition's figure-ground balance to the product's silhouette proportion.",
        ],
        "Editorial": [
            "Use the dominant palette as the art direction brief for a photo series or layout system.",
            "Pull the strongest crop as a grid-breaking hero image or opening spread.",
            "Apply the tonal contrast as the text-on-image system: which fields are safe for type.",
        ],
    }

    applications = applications_by_project.get(
        project_type,
        [
            "Build a focused visual system from the two strongest color relationships in this reference.",
            "Use the image's surface quality and texture as the tactile language for the project.",
            "Apply the composition logic — crop, weight, depth — to primary layout or mark proportions.",
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
