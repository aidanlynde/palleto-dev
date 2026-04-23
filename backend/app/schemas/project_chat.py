from pydantic import BaseModel, Field


class ProjectBriefDraft(BaseModel):
    name: str | None = Field(default=None, max_length=255)
    description: str | None = None
    project_type: str | None = Field(default=None, max_length=120)
    audience: str | None = Field(default=None, max_length=255)
    desired_feeling: str | None = None
    avoid: str | None = None
    direction_tags: list[str] = []
    priorities: list[str] = []
    reference_links: list[str] = []
    reference_images: list[str] = []


class ProjectChatMessage(BaseModel):
    role: str
    content: str


class ProjectChatRequest(BaseModel):
    message: str | None = None
    history: list[ProjectChatMessage] = []
    draft: ProjectBriefDraft | None = None
    reference_links: list[str] = []
    reference_images: list[str] = []


class ProjectChatResponse(BaseModel):
    assistant_message: str
    suggested_replies: list[str]
    draft: ProjectBriefDraft
    brief_summary: str
    missing_fields: list[str]
    is_ready_to_save: bool


class ProjectReferenceImageRead(BaseModel):
    image_url: str
