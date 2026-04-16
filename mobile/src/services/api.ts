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
    title: string;
    url: string;
  }>;
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
