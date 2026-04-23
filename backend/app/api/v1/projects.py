from fastapi import APIRouter, Depends, File, Response, UploadFile, status

from app.core.auth import FirebaseUser, get_current_firebase_user
from app.db.models import ActiveProject, TasteProfile
from app.db.session import DbSession, create_db_and_tables
from app.schemas.project import ActiveProjectRead, ActiveProjectWrite
from app.schemas.project_chat import (
    ProjectChatRequest,
    ProjectChatResponse,
    ProjectReferenceImageRead,
)
from app.schemas.taste_profile import TasteProfileRead, TasteProfileWrite
from app.services.project_chat import build_project_chat_response
from app.services.projects import get_active_project, upsert_active_project
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
