import AsyncStorage from "@react-native-async-storage/async-storage";

const PROJECT_CONTEXT_KEY = "palleto:active-project-context";

export type ProjectContext = {
  avoid: string | null;
  createdAt: string;
  description: string;
  directionTags: string[];
  id: string;
  name: string;
  priorities: string[];
  projectType: string;
  updatedAt: string;
};

export type ProjectContextInput = Omit<ProjectContext, "createdAt" | "id" | "updatedAt">;

export async function getActiveProjectContext() {
  const rawProject = await AsyncStorage.getItem(PROJECT_CONTEXT_KEY);

  if (!rawProject) {
    return null;
  }

  return JSON.parse(rawProject) as ProjectContext;
}

export async function saveActiveProjectContext(projectInput: ProjectContextInput) {
  const now = new Date().toISOString();
  const existingProject = await getActiveProjectContext();
  const project: ProjectContext = {
    ...projectInput,
    id: existingProject?.id ?? `local-${Date.now()}`,
    createdAt: existingProject?.createdAt ?? now,
    updatedAt: now
  };

  await AsyncStorage.setItem(PROJECT_CONTEXT_KEY, JSON.stringify(project));

  return project;
}
