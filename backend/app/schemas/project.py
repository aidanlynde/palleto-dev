from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ActiveProjectBase(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    description: str = Field(min_length=1)
    project_type: str = Field(min_length=1, max_length=120)
    audience: str | None = Field(default=None, max_length=255)
    desired_feeling: str | None = None
    avoid: str | None = None
    direction_tags: list[str] = []
    priorities: list[str] = []
    reference_links: list[str] = []
    reference_images: list[str] = []


class ActiveProjectWrite(ActiveProjectBase):
    pass


class ActiveProjectRead(ActiveProjectBase):
    id: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ── Multi-project schemas ──────────────────────────────────────

class ProjectChatMessageSchema(BaseModel):
    role: str
    content: str


class ProjectSummary(BaseModel):
    """Lightweight row for the conversation list."""
    id: str
    name: str | None
    project_type: str | None
    brief_summary: str | None
    is_active: bool
    message_count: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ProjectDetail(BaseModel):
    """Full project with chat history, returned after create/get/chat."""
    id: str
    name: str | None
    project_type: str | None
    description: str | None
    audience: str | None
    desired_feeling: str | None
    avoid: str | None
    direction_tags: list[str]
    priorities: list[str]
    reference_links: list[str]
    reference_images: list[str]
    chat_history: list[ProjectChatMessageSchema]
    brief_summary: str | None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ProjectChatSendRequest(BaseModel):
    message: str | None = None
    reference_images: list[str] = []
    reference_links: list[str] = []


class ProjectWithChatResponse(BaseModel):
    """Returned by create-project and send-message endpoints."""
    project: ProjectDetail
    assistant_message: str
    suggested_replies: list[str]
    missing_fields: list[str]
    is_ready_to_save: bool
