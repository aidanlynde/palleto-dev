from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.schemas.project import ActiveProjectRead


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
    reason: str | None = None
    thumbnail_url: str | None = None
    title: str
    url: str


class ProjectContextPayload(BaseModel):
    avoid: str | None = None
    audience: str | None = None
    desiredFeeling: str | None = None
    description: str | None = None
    directionTags: list[str] = []
    name: str | None = None
    priorities: list[str] = []
    referenceLinks: list[str] = []
    projectType: str | None = None

    @classmethod
    def from_active_project(cls, project: ActiveProjectRead) -> "ProjectContextPayload":
        return cls(
            avoid=project.avoid,
            audience=project.audience,
            desiredFeeling=project.desired_feeling,
            description=project.description,
            directionTags=project.direction_tags,
            name=project.name,
            priorities=project.priorities,
            projectType=project.project_type,
            referenceLinks=project.reference_links,
        )


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


class CardRefinementCreate(BaseModel):
    instruction: str
    preset_label: str | None = None


class CardRefinementRead(BaseModel):
    id: str
    card_id: str
    preset_label: str | None
    instruction: str
    refined_card: CardRead
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CardShareRead(BaseModel):
    id: str
    card_id: str
    share_token: str
    share_url: str
    created_at: datetime
    updated_at: datetime
