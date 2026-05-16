from sqlalchemy.orm import Session

from app.db.models import ActiveProject, Project, User
from app.schemas.project import ActiveProjectWrite
from app.schemas.project_chat import ProjectBriefDraft, ProjectChatMessage, ProjectChatRequest, ProjectChatResponse


# ── ActiveProject (legacy single-project, kept for card scanning compat) ──

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
    project.reference_images = _normalized_list(payload.reference_images)
    project.reference_links = _normalized_list(payload.reference_links)

    db.flush()

    return project


def _sync_active_project(db: Session, user: User, project: Project) -> None:
    """Keep the legacy active_projects row in sync so card scanning still works."""
    active = get_active_project(db, user)
    if active is None:
        active = ActiveProject(user_id=user.id)
        db.add(active)

    active.name = project.name or "Active project"
    active.description = project.description or ""
    active.project_type = project.project_type or ""
    active.audience = project.audience
    active.desired_feeling = project.desired_feeling
    active.avoid = project.avoid
    active.direction_tags = list(project.direction_tags)
    active.priorities = list(project.priorities)
    active.reference_links = list(project.reference_links)
    active.reference_images = list(project.reference_images)
    db.flush()


# ── Project (multi-project, with stored chat history) ──────────

def list_projects(db: Session, user: User) -> list[Project]:
    return (
        db.query(Project)
        .filter(Project.user_id == user.id)
        .order_by(Project.updated_at.desc())
        .all()
    )


def create_project(db: Session, user: User) -> Project:
    project = Project(user_id=user.id, chat_history=[], direction_tags=[], priorities=[], reference_links=[], reference_images=[])
    db.add(project)
    db.flush()
    return project


def get_project(db: Session, user: User, project_id: str) -> Project | None:
    return db.query(Project).filter(Project.user_id == user.id, Project.id == project_id).one_or_none()


def delete_project(db: Session, user: User, project_id: str) -> bool:
    project = get_project(db, user, project_id)
    if project is None:
        return False
    db.delete(project)
    db.flush()
    return True


def activate_project(db: Session, user: User, project_id: str) -> Project | None:
    project = get_project(db, user, project_id)
    if project is None:
        return None

    # Deactivate all others
    db.query(Project).filter(Project.user_id == user.id, Project.id != project_id).update({"is_active": False})
    project.is_active = True
    db.flush()

    # Keep legacy active_project table in sync
    _sync_active_project(db, user, project)
    db.flush()

    return project


def apply_chat_response_to_project(
    db: Session,
    project: Project,
    *,
    new_user_message: str | None,
    response: ProjectChatResponse,
) -> Project:
    """Persist the latest chat turn (user + assistant) and updated draft to the project row."""
    history: list[dict] = list(project.chat_history or [])
    if new_user_message:
        history.append({"role": "user", "content": new_user_message})
    history.append({"role": "assistant", "content": response.assistant_message})

    project.chat_history = history
    project.brief_summary = response.brief_summary
    project.name = response.draft.name or project.name
    project.project_type = response.draft.project_type or project.project_type
    project.description = response.draft.description or project.description
    project.audience = response.draft.audience or project.audience
    project.desired_feeling = response.draft.desired_feeling or project.desired_feeling
    project.avoid = response.draft.avoid or project.avoid
    project.direction_tags = list(response.draft.direction_tags)
    project.priorities = list(response.draft.priorities)
    project.reference_links = list(response.draft.reference_links)
    project.reference_images = list(response.draft.reference_images)

    db.flush()
    return project


def build_draft_from_project(project: Project) -> ProjectBriefDraft:
    return ProjectBriefDraft(
        name=project.name,
        description=project.description,
        project_type=project.project_type,
        audience=project.audience,
        desired_feeling=project.desired_feeling,
        avoid=project.avoid,
        direction_tags=list(project.direction_tags or []),
        priorities=list(project.priorities or []),
        reference_links=list(project.reference_links or []),
        reference_images=list(project.reference_images or []),
    )


def build_history_from_project(project: Project) -> list[ProjectChatMessage]:
    return [ProjectChatMessage(role=m["role"], content=m["content"]) for m in (project.chat_history or [])]


# ── Helpers ────────────────────────────────────────────────────

def _normalized_text(value: str | None) -> str | None:
    if value is None:
        return None
    normalized = value.strip()
    return normalized or None


def _normalized_list(values: list[str]) -> list[str]:
    return [value.strip() for value in values if value and value.strip()]
