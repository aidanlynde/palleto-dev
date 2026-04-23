from app.db.models import ActiveProject, TasteProfile
from app.schemas.card import ProjectContextPayload


def build_project_context_payload(
    *,
    active_project: ActiveProject | None,
    taste_profile: TasteProfile | None,
    override: ProjectContextPayload | None = None,
) -> ProjectContextPayload | None:
    if active_project is None and taste_profile is None and override is None:
        return None

    payload = ProjectContextPayload(
        avoid=override.avoid if override is not None else active_project.avoid if active_project else None,
        audience=(
            override.audience
            if override is not None
            else active_project.audience if active_project else None
        ),
        desiredFeeling=(
            override.desiredFeeling
            if override is not None
            else active_project.desired_feeling if active_project else None
        ),
        description=(
            override.description
            if override is not None
            else active_project.description if active_project else None
        ),
        directionTags=(
            override.directionTags
            if override is not None
            else active_project.direction_tags if active_project else []
        ),
        name=override.name if override is not None else active_project.name if active_project else None,
        priorities=(
            override.priorities
            if override is not None
            else active_project.priorities if active_project else []
        ),
        projectType=(
            override.projectType
            if override is not None
            else active_project.project_type if active_project else None
        ),
        referenceImages=(
            override.referenceImages
            if override is not None
            else active_project.reference_images if active_project else []
        ),
        referenceLinks=(
            override.referenceLinks
            if override is not None
            else active_project.reference_links if active_project else []
        ),
        tasteProfileAvoid=taste_profile.avoid if taste_profile else [],
        tasteProfileExtractFromReference=(
            taste_profile.extract_from_reference if taste_profile else []
        ),
        tasteProfileLeanToward=taste_profile.lean_toward if taste_profile else [],
        tasteProfileSummary=taste_profile.summary if taste_profile else None,
        tasteProfileUsefulScan=taste_profile.useful_scan if taste_profile else [],
        tasteProfileWorkFor=taste_profile.work_for if taste_profile else [],
    )

    if not payload.name and payload.description:
        payload.name = _infer_project_name(payload.description, payload.projectType)

    return payload


def _infer_project_name(description: str, project_type: str | None) -> str:
    first_sentence = description.split(".")[0].strip()
    if first_sentence and len(first_sentence) <= 42:
        return first_sentence
    return project_type or "Active project"
