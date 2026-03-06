export type DiagramEngineId = "structurizr" | "mermaid";
export type DiagramViewId = "container" | "deployment";

export type DiagramTheme = {
  id: string;
  label: string;
};

export type DiagramArtifactFile = {
  name: string;
  mimeType: string;
  content: string;
};

export type DiagramArtifact = {
  engineId: DiagramEngineId;
  fileExtension: ".dsl" | ".mmd";
  mimeType: string;
  content: string;
  defaultView?: DiagramViewId;
  viewContents?: Partial<Record<DiagramViewId, string>>;
  files?: DiagramArtifactFile[];
};

export type DiagramEngine = {
  id: DiagramEngineId;
  shortId: "dsl" | "mmd";
  label: string;
  canRender: boolean;
  renderFormats: Array<"svg" | "png">;
  themes: DiagramTheme[];
  generate: (input: unknown, themeId: string) => DiagramArtifact;
};
