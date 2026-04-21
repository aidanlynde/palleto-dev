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
    referenceLinks: [],
  };
}
