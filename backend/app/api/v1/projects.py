from fastapi import APIRouter, Depends, Response, status

from app.core.auth import FirebaseUser, get_current_firebase_user
from app.db.models import ActiveProject
from app.db.session import DbSession, create_db_and_tables
from app.schemas.project import ActiveProjectRead, ActiveProjectWrite
from app.services.projects import get_active_project, upsert_active_project
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
