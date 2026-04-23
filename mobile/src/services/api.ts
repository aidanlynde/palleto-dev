import { OnboardingSurveyAnswers } from "./onboarding";
import { ProjectContext } from "./projectContext";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export type UserProfile = {
  id: string;
  firebase_uid: string;
  email: string | null;
  display_name: string | null;
  photo_url: string | null;
  created_at: string;
  updated_at: string;
};

export async function getMe(idToken: string): Promise<UserProfile> {
  const response = await fetch(`${API_BASE_URL}/api/v1/me`, {
    headers: {
      Authorization: `Bearer ${idToken}`
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to sync profile: ${response.status}`);
  }

  return response.json();
}

type ActiveProjectApiResponse = {
  id: string;
  name: string;
  description: string;
  project_type: string;
  audience: string | null;
  desired_feeling: string | null;
  avoid: string | null;
  direction_tags: string[];
  priorities: string[];
  reference_images: string[];
  reference_links: string[];
  created_at: string;
  updated_at: string;
};

export type ProjectChatMessage = {
  role: "assistant" | "user";
  content: string;
};

export type ProjectBriefDraft = {
  name: string | null;
  description: string | null;
  projectType: string | null;
  audience: string | null;
  desiredFeeling: string | null;
  avoid: string | null;
  directionTags: string[];
  priorities: string[];
  referenceLinks: string[];
  referenceImages: string[];
};

export type ProjectChatResponse = {
  assistantMessage: string;
  suggestedReplies: string[];
  draft: ProjectBriefDraft;
  briefSummary: string;
  missingFields: string[];
  isReadyToSave: boolean;
};

export type InspirationCard = {
  id: string;
  image_url: string;
  source_type: string;
  title: string;
  one_line_read: string;
  creative_direction: string;
  palette: Array<{
    hex: string;
    label: string;
    role: string;
  }>;
  visual_dna: {
    composition: string;
    contrast: string;
    shape_language: string;
    texture: string;
  };
  design_moves: string[];
  project_lens: {
    applications: string[];
    project_type: string;
    summary: string;
  };
  type_direction: Array<{
    style: string;
    use: string;
  }>;
  search_language: string[];
  related_links: Array<{
    provider: string;
    reason: string | null;
    thumbnail_url: string | null;
    title: string;
    url: string;
  }>;
  created_at: string;
  updated_at: string;
};

export type CardRefinement = {
  id: string;
  card_id: string;
  preset_label: string | null;
  instruction: string;
  refined_card: InspirationCard;
  created_at: string;
  updated_at: string;
};

export type CardShare = {
  id: string;
  card_id: string;
  share_token: string;
  share_url: string;
  created_at: string;
  updated_at: string;
};

type UploadCardInput = {
  idToken: string;
  imageUri: string;
  mimeType?: string | null;
  projectContext: ProjectContext | null;
  sourceType: "camera" | "library";
};

export async function uploadCard({
  idToken,
  imageUri,
  mimeType,
  projectContext,
  sourceType
}: UploadCardInput): Promise<InspirationCard> {
  const formData = new FormData();
  const fileName = imageUri.split("/").pop() || "inspiration.jpg";

  formData.append("image", {
    name: fileName,
    type: mimeType || "image/jpeg",
    uri: imageUri
  } as unknown as Blob);
  formData.append("source_type", sourceType);

  if (projectContext) {
    formData.append("project_context", JSON.stringify(projectContext));
  }

  const response = await fetch(`${API_BASE_URL}/api/v1/cards`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${idToken}`
    },
    body: formData
  });

  if (!response.ok) {
    throw new Error(`Failed to create card: ${response.status}`);
  }

  return response.json();
}

export async function getActiveProject(idToken: string): Promise<ProjectContext | null> {
  const response = await fetch(`${API_BASE_URL}/api/v1/projects/active`, {
    headers: {
      Authorization: `Bearer ${idToken}`
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to load active project: ${response.status}`);
  }

  const payload = (await response.json()) as ActiveProjectApiResponse | null;
  return payload ? mapActiveProject(payload) : null;
}

export async function saveActiveProject(
  idToken: string,
  project: Omit<ProjectContext, "createdAt" | "id" | "updatedAt">
): Promise<ProjectContext> {
  const response = await fetch(`${API_BASE_URL}/api/v1/projects/active`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${idToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      avoid: project.avoid,
      audience: project.audience,
      description: project.description,
      desired_feeling: project.desiredFeeling,
      direction_tags: project.directionTags,
      name: project.name,
      priorities: project.priorities,
      project_type: project.projectType,
      reference_images: project.referenceImages,
      reference_links: project.referenceLinks
    })
  });

  if (!response.ok) {
    throw new Error(`Failed to save active project: ${response.status}`);
  }

  return mapActiveProject((await response.json()) as ActiveProjectApiResponse);
}

export async function listCards(idToken: string): Promise<InspirationCard[]> {
  const response = await fetch(`${API_BASE_URL}/api/v1/cards`, {
    headers: {
      Authorization: `Bearer ${idToken}`
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to load cards: ${response.status}`);
  }

  return response.json();
}

export async function saveTasteProfile(
  idToken: string,
  onboardingAnswers: OnboardingSurveyAnswers
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/v1/projects/taste-profile`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${idToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      onboarding_answers: onboardingAnswers
    })
  });

  if (!response.ok) {
    throw new Error(`Failed to save taste profile: ${response.status}`);
  }
}

export async function respondProjectChat(
  idToken: string,
  input: {
    draft?: ProjectBriefDraft | null;
    history?: ProjectChatMessage[];
    message?: string | null;
    referenceImages?: string[];
    referenceLinks?: string[];
  }
): Promise<ProjectChatResponse> {
  const response = await fetch(`${API_BASE_URL}/api/v1/projects/chat/respond`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${idToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      draft: input.draft ? mapDraftToApi(input.draft) : null,
      history: input.history ?? [],
      message: input.message ?? null,
      reference_images: input.referenceImages ?? [],
      reference_links: input.referenceLinks ?? []
    })
  });

  if (!response.ok) {
    throw new Error(`Failed to continue project chat: ${response.status}`);
  }

  return mapProjectChatResponse(await response.json());
}

export async function uploadProjectReferenceImage(
  idToken: string,
  input: {
    imageUri: string;
    mimeType?: string | null;
  }
): Promise<string> {
  const formData = new FormData();
  const fileName = input.imageUri.split("/").pop() || "reference.jpg";

  formData.append("image", {
    name: fileName,
    type: input.mimeType || "image/jpeg",
    uri: input.imageUri
  } as unknown as Blob);

  const response = await fetch(`${API_BASE_URL}/api/v1/projects/reference-image`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${idToken}`
    },
    body: formData
  });

  if (!response.ok) {
    throw new Error(`Failed to upload project reference image: ${response.status}`);
  }

  const payload = (await response.json()) as { image_url: string };
  return payload.image_url;
}

export async function deleteCard(idToken: string, cardId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/v1/cards/${cardId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${idToken}`
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to delete card: ${response.status}`);
  }
}

export async function listCardRefinements(
  idToken: string,
  cardId: string
): Promise<CardRefinement[]> {
  const response = await fetch(`${API_BASE_URL}/api/v1/cards/${cardId}/refinements`, {
    headers: {
      Authorization: `Bearer ${idToken}`
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to load refinements: ${response.status}`);
  }

  return response.json();
}

export async function createCardRefinement(
  idToken: string,
  cardId: string,
  input: { instruction: string; presetLabel?: string | null }
): Promise<CardRefinement> {
  const response = await fetch(`${API_BASE_URL}/api/v1/cards/${cardId}/refinements`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${idToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      instruction: input.instruction,
      preset_label: input.presetLabel ?? null
    })
  });

  if (!response.ok) {
    throw new Error(`Failed to refine card: ${response.status}`);
  }

  return response.json();
}

export async function createOrGetCardShare(
  idToken: string,
  cardId: string
): Promise<CardShare> {
  const response = await fetch(`${API_BASE_URL}/api/v1/cards/${cardId}/share`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${idToken}`
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to create share: ${response.status}`);
  }

  return response.json();
}

function mapActiveProject(payload: ActiveProjectApiResponse): ProjectContext {
  return {
    avoid: payload.avoid,
    audience: payload.audience,
    createdAt: payload.created_at,
    description: payload.description,
    desiredFeeling: payload.desired_feeling,
    directionTags: payload.direction_tags,
    id: payload.id,
    name: payload.name,
    priorities: payload.priorities,
    projectType: payload.project_type,
    referenceImages: payload.reference_images,
    referenceLinks: payload.reference_links,
    updatedAt: payload.updated_at
  };
}

function mapProjectChatResponse(payload: {
  assistant_message: string;
  suggested_replies: string[];
  draft: {
    name?: string | null;
    description?: string | null;
    project_type?: string | null;
    audience?: string | null;
    desired_feeling?: string | null;
    avoid?: string | null;
    direction_tags?: string[];
    priorities?: string[];
    reference_links?: string[];
    reference_images?: string[];
  };
  brief_summary: string;
  missing_fields: string[];
  is_ready_to_save: boolean;
}): ProjectChatResponse {
  return {
    assistantMessage: payload.assistant_message,
    briefSummary: payload.brief_summary,
    draft: {
      audience: payload.draft.audience ?? null,
      avoid: payload.draft.avoid ?? null,
      description: payload.draft.description ?? null,
      desiredFeeling: payload.draft.desired_feeling ?? null,
      directionTags: payload.draft.direction_tags ?? [],
      name: payload.draft.name ?? null,
      priorities: payload.draft.priorities ?? [],
      projectType: payload.draft.project_type ?? null,
      referenceImages: payload.draft.reference_images ?? [],
      referenceLinks: payload.draft.reference_links ?? []
    },
    isReadyToSave: payload.is_ready_to_save,
    missingFields: payload.missing_fields,
    suggestedReplies: payload.suggested_replies
  };
}

function mapDraftToApi(draft: ProjectBriefDraft) {
  return {
    audience: draft.audience,
    avoid: draft.avoid,
    description: draft.description,
    desired_feeling: draft.desiredFeeling,
    direction_tags: draft.directionTags,
    name: draft.name,
    priorities: draft.priorities,
    project_type: draft.projectType,
    reference_images: draft.referenceImages,
    reference_links: draft.referenceLinks
  };
}
