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
  reference_links: string[];
  created_at: string;
  updated_at: string;
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
    referenceLinks: payload.reference_links,
    updatedAt: payload.updated_at
  };
}
