import type { DiagramArtifact, DiagramEngineId } from "@/domain/diagram";
import { diagramEngines } from "@/config/diagram-options";
import type { NormalizedDeployment } from "@/domain/deployment-model";
import { DiagramRegistry } from "@/engines/registry";

const registry = new DiagramRegistry(diagramEngines);

export function generateArtifact(
  engineId: DiagramEngineId,
  deployment: NormalizedDeployment,
  themeId: string
): DiagramArtifact {
  const engine = registry.get(engineId);
  return engine.generate(deployment, themeId);
}

export async function generateAll(input: unknown, themeId = "default") {
  const deployment = input as NormalizedDeployment;
  const engines = registry.all();
  const artifacts: DiagramArtifact[] = [];
  for (const e of engines) {
    artifacts.push(e.generate(deployment, themeId));
  }

  return artifacts;
}

export default generateAll;
