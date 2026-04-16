from datetime import datetime

from pydantic import BaseModel, ConfigDict


class PaletteColor(BaseModel):
    hex: str
    label: str
    role: str


class VisualDna(BaseModel):
    composition: str
    contrast: str
    shape_language: str
    texture: str


class ProjectLens(BaseModel):
    applications: list[str]
    project_type: str
    summary: str


class TypeDirection(BaseModel):
    style: str
    use: str


class RelatedLink(BaseModel):
    provider: str
    title: str
    url: str


class ProjectContextPayload(BaseModel):
    avoid: str | None = None
    description: str | None = None
    directionTags: list[str] = []
    name: str | None = None
    priorities: list[str] = []
    projectType: str | None = None


class CardRead(BaseModel):
    id: str
    image_url: str
    source_type: str
    title: str
    one_line_read: str
    creative_direction: str
    palette: list[PaletteColor]
    visual_dna: VisualDna
    design_moves: list[str]
    project_lens: ProjectLens
    type_direction: list[TypeDirection]
    search_language: list[str]
    related_links: list[RelatedLink]
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
