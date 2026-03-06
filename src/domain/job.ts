export type JobStatus = "idle" | "queued" | "running" | "done" | "failed";

export interface DiagramJob {
  id: string;
  engineId: string;
  themeId: string;
  status: JobStatus;
  artifact?: string; // runtime object URL
  artifactName?: string; // filename for download
  artifactData?: string; // data URL (base64) persisted so artifact can be recreated
  error?: string;
}

export function initialJob(engineId: string, themeId: string): DiagramJob {
  const ts = Date.now();
  return {
    id: `${engineId}-${themeId}-${ts}`,
    engineId,
    themeId,
    status: "idle"
  };
}

export default DiagramJob;
