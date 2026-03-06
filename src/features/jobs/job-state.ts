import type { DiagramArtifact, DiagramEngineId, DiagramViewId } from "@/domain/diagram";

export type JobStatus = "idle" | "generating" | "success" | "error";

export type EngineJob = {
  engineId: DiagramEngineId;
  status: JobStatus;
  artifact: DiagramArtifact | null;
  error: string;
  themeId: string;
  renderFormat: "svg" | "png";
  renderView: DiagramViewId;
};

export function initialJob(engineId: DiagramEngineId, themeId: string): EngineJob {
  return {
    engineId,
    status: "idle",
    artifact: null,
    error: "",
    themeId,
    renderFormat: "svg",
    renderView: "container"
  };
}