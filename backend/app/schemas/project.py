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
