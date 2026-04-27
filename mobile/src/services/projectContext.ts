import AsyncStorage from "@react-native-async-storage/async-storage";

const ACTIVE_PROJECT_CACHE_KEY = "palleto:active-project-cache";

export type ProjectContext = {
  avoid: string | null;
  audience: string | null;
  createdAt: string;
  description: string;
  desiredFeeling: string | null;
  directionTags: string[];
  id: string;
  name: string;
  priorities: string[];
  projectType: string;
  referenceImages: string[];
  referenceLinks: string[];
  updatedAt: string;
};

export type ProjectContextInput = Omit<ProjectContext, "createdAt" | "id" | "updatedAt">;

export function createEmptyProjectContextInput(): ProjectContextInput {
  return {
    avoid: null,
    audience: null,
    description: "",
    desiredFeeling: null,
    directionTags: [],
    name: "",
    priorities: [],
    projectType: "",
    referenceImages: [],
    referenceLinks: [],
  };
}

export async function getCachedProjectContext(): Promise<ProjectContext | null> {
  const rawProject = await AsyncStorage.getItem(ACTIVE_PROJECT_CACHE_KEY);

  if (!rawProject) {
    return null;
  }

  return JSON.parse(rawProject) as ProjectContext;
}

export async function cacheProjectContext(project: ProjectContext | null): Promise<void> {
  if (!project) {
    await AsyncStorage.removeItem(ACTIVE_PROJECT_CACHE_KEY);
    return;
  }

  await AsyncStorage.setItem(ACTIVE_PROJECT_CACHE_KEY, JSON.stringify(project));
}
