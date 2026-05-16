from fastapi import APIRouter, Depends, File, HTTPException, Response, UploadFile, status

from app.core.auth import FirebaseUser, get_current_firebase_user
from app.db.models import ActiveProject, Project, TasteProfile
from app.db.session import DbSession, create_db_and_tables
from app.schemas.project import (
    ActiveProjectRead,
    ActiveProjectWrite,
    ProjectChatSendRequest,
    ProjectDetail,
    ProjectSummary,
    ProjectWithChatResponse,
)
from app.schemas.project_chat import (
    ProjectChatRequest,
    ProjectChatResponse,
    ProjectReferenceImageRead,
)
from app.schemas.taste_profile import TasteProfileRead, TasteProfileWrite
from app.services.project_chat import build_project_chat_response
from app.services.projects import (
    activate_project,
    apply_chat_response_to_project,
    build_draft_from_project,
    build_history_from_project,
    create_project,
    delete_project,
    get_active_project,
    get_project,
    list_projects,
    upsert_active_project,
)
from app.services.storage import upload_project_reference_image
from app.services.taste_profiles import get_taste_profile, upsert_taste_profile
from app.services.users import get_or_create_user

router = APIRouter(prefix="/projects", tags=["projects"])


@router.get("/active", response_model=ActiveProjectRead | None)
def read_active_project(
    db: DbSession,
    firebase_user: FirebaseUser = Depends(get_current_firebase_user),
) -> ActiveProject | None:
    create_db_and_tables()

    user = get_or_create_user(db, firebase_user)
    db.commit()

    return get_active_project(db, user)


@router.put("/active", response_model=ActiveProjectRead, status_code=status.HTTP_200_OK)
def write_active_project(
    payload: ActiveProjectWrite,
    db: DbSession,
    firebase_user: FirebaseUser = Depends(get_current_firebase_user),
) -> ActiveProject:
    create_db_and_tables()

    user = get_or_create_user(db, firebase_user)
    project = upsert_active_project(db, user, payload)
    db.commit()
    db.refresh(project)

    return project


@router.get("/taste-profile", response_model=TasteProfileRead | None)
def read_taste_profile(
    db: DbSession,
    firebase_user: FirebaseUser = Depends(get_current_firebase_user),
) -> TasteProfile | None:
    create_db_and_tables()

    user = get_or_create_user(db, firebase_user)
    db.commit()

    return get_taste_profile(db, user)


@router.put("/taste-profile", response_model=TasteProfileRead, status_code=status.HTTP_200_OK)
def write_taste_profile(
    payload: TasteProfileWrite,
    db: DbSession,
    firebase_user: FirebaseUser = Depends(get_current_firebase_user),
) -> TasteProfile:
    create_db_and_tables()

    user = get_or_create_user(db, firebase_user)
    profile = upsert_taste_profile(db, user, payload)
    db.commit()
    db.refresh(profile)

    return profile


@router.post("/chat/respond", response_model=ProjectChatResponse, status_code=status.HTTP_200_OK)
def respond_project_chat(
    payload: ProjectChatRequest,
    db: DbSession,
    firebase_user: FirebaseUser = Depends(get_current_firebase_user),
) -> ProjectChatResponse:
    create_db_and_tables()

    user = get_or_create_user(db, firebase_user)
    db.commit()

    return build_project_chat_response(
        active_project=get_active_project(db, user),
        taste_profile=get_taste_profile(db, user),
        payload=payload,
    )


@router.post(
    "/reference-image",
    response_model=ProjectReferenceImageRead,
    status_code=status.HTTP_201_CREATED,
)
async def upload_reference_image(
    db: DbSession,
    image: UploadFile = File(...),
    firebase_user: FirebaseUser = Depends(get_current_firebase_user),
) -> ProjectReferenceImageRead:
    create_db_and_tables()

    get_or_create_user(db, firebase_user)
    db.commit()

    _, image_url = await upload_project_reference_image(
        firebase_uid=firebase_user.uid,
        image=image,
    )

    return ProjectReferenceImageRead(image_url=image_url)


@router.delete("/active", status_code=status.HTTP_204_NO_CONTENT)
def delete_active_project(
    db: DbSession,
    firebase_user: FirebaseUser = Depends(get_current_firebase_user),
) -> Response:
    create_db_and_tables()

    user = get_or_create_user(db, firebase_user)
    project = get_active_project(db, user)

    if project is not None:
        db.delete(project)
        db.commit()
    else:
        db.commit()

    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ── Multi-project endpoints ─────────────────────────────────────
# NOTE: literal paths (/active, /chat/respond, /taste-profile, /reference-image)
# are declared above {project_id} so FastAPI matches them first.

@router.get("", response_model=list[ProjectSummary])
def read_projects(
    db: DbSession,
    firebase_user: FirebaseUser = Depends(get_current_firebase_user),
) -> list[Project]:
    create_db_and_tables()
    user = get_or_create_user(db, firebase_user)
    db.commit()
    projects = list_projects(db, user)
    # Annotate with message_count (not a DB column)
    for p in projects:
        p.__dict__.setdefault("message_count", len(p.chat_history or []))
    return projects


@router.post("", response_model=ProjectWithChatResponse, status_code=status.HTTP_201_CREATED)
def create_project_and_bootstrap(
    db: DbSession,
    firebase_user: FirebaseUser = Depends(get_current_firebase_user),
) -> ProjectWithChatResponse:
    """Create a blank project and run the bootstrap chat turn to get the first AI greeting."""
    create_db_and_tables()
    user = get_or_create_user(db, firebase_user)
    project = create_project(db, user)
    db.commit()

    taste_profile = get_taste_profile(db, user)
    payload = ProjectChatRequest(message=None, history=[], draft=None)
    response = build_project_chat_response(
        active_project=None,
        taste_profile=taste_profile,
        payload=payload,
    )

    project = apply_chat_response_to_project(db, project, new_user_message=None, response=response)
    db.commit()
    db.refresh(project)

    return ProjectWithChatResponse(
        project=ProjectDetail.model_validate(project),
        assistant_message=response.assistant_message,
        suggested_replies=response.suggested_replies,
        missing_fields=response.missing_fields,
        is_ready_to_save=response.is_ready_to_save,
    )


@router.get("/{project_id}", response_model=ProjectDetail)
def read_project(
    project_id: str,
    db: DbSession,
    firebase_user: FirebaseUser = Depends(get_current_firebase_user),
) -> Project:
    create_db_and_tables()
    user = get_or_create_user(db, firebase_user)
    db.commit()
    project = get_project(db, user, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project_endpoint(
    project_id: str,
    db: DbSession,
    firebase_user: FirebaseUser = Depends(get_current_firebase_user),
) -> Response:
    create_db_and_tables()
    user = get_or_create_user(db, firebase_user)
    found = delete_project(db, user, project_id)
    db.commit()
    if not found:
        raise HTTPException(status_code=404, detail="Project not found")
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.put("/{project_id}/activate", response_model=ProjectDetail)
def activate_project_endpoint(
    project_id: str,
    db: DbSession,
    firebase_user: FirebaseUser = Depends(get_current_firebase_user),
) -> Project:
    """Set this project as the active scan context. Syncs to legacy active_projects table."""
    create_db_and_tables()
    user = get_or_create_user(db, firebase_user)
    project = activate_project(db, user, project_id)
    db.commit()
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    db.refresh(project)
    return project


@router.post("/{project_id}/chat", response_model=ProjectWithChatResponse)
def send_project_chat(
    project_id: str,
    payload: ProjectChatSendRequest,
    db: DbSession,
    firebase_user: FirebaseUser = Depends(get_current_firebase_user),
) -> ProjectWithChatResponse:
    """Send a message to a project conversation. History is loaded from + saved to the DB."""
    create_db_and_tables()
    user = get_or_create_user(db, firebase_user)
    project = get_project(db, user, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    db.commit()

    taste_profile = get_taste_profile(db, user)
    chat_request = ProjectChatRequest(
        message=payload.message,
        history=build_history_from_project(project),
        draft=build_draft_from_project(project),
        reference_images=payload.reference_images,
        reference_links=payload.reference_links,
    )
    response = build_project_chat_response(
        active_project=None,
        taste_profile=taste_profile,
        payload=chat_request,
    )

    project = apply_chat_response_to_project(db, project, new_user_message=payload.message, response=response)
    db.commit()
    db.refresh(project)

    return ProjectWithChatResponse(
        project=ProjectDetail.model_validate(project),
        assistant_message=response.assistant_message,
        suggested_replies=response.suggested_replies,
        missing_fields=response.missing_fields,
        is_ready_to_save=response.is_ready_to_save,
    )
