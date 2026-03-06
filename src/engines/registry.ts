import type { DiagramEngine, DiagramEngineId } from "@/domain/diagram";

export class DiagramRegistry {
  private readonly byId = new Map<DiagramEngineId, DiagramEngine>();

  constructor(engines: DiagramEngine[]) {
    engines.forEach((engine) => {
      this.byId.set(engine.id, engine);
    });
  }

  get(engineId: DiagramEngineId): DiagramEngine {
    const engine = this.byId.get(engineId);
    if (!engine) {
      throw new Error(`Engine not found: ${engineId}`);
    }
    return engine;
  }

  all(): DiagramEngine[] {
    return Array.from(this.byId.values());
  }
}
