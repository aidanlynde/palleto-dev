from sqlalchemy.orm import Session

from app.db.models import ActiveProject, User
from app.schemas.project import ActiveProjectWrite


def get_active_project(db: Session, user: User) -> ActiveProject | None:
    return db.query(ActiveProject).filter(ActiveProject.user_id == user.id).one_or_none()


def upsert_active_project(db: Session, user: User, payload: ActiveProjectWrite) -> ActiveProject:
    project = get_active_project(db, user)

    if project is None:
        project = ActiveProject(user_id=user.id)
        db.add(project)

    project.name = payload.name.strip()
    project.description = payload.description.strip()
    project.project_type = payload.project_type.strip()
    project.audience = _normalized_text(payload.audience)
    project.desired_feeling = _normalized_text(payload.desired_feeling)
    project.avoid = _normalized_text(payload.avoid)
    project.direction_tags = _normalized_list(payload.direction_tags)
    project.priorities = _normalized_list(payload.priorities)
    project.reference_links = _normalized_list(payload.reference_links)

    db.flush()

    return project


def _normalized_text(value: str | None) -> str | None:
    if value is None:
        return None

    normalized = value.strip()
    return normalized or None


def _normalized_list(values: list[str]) -> list[str]:
    return [value.strip() for value in values if value and value.strip()]
