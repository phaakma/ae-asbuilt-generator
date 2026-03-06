import type { DiagramEngine } from "@/domain/diagram";
import { generateMermaid } from "@/engines/mermaid/generator";
import { generateStructurizr } from "@/engines/structurizr/generator";

export const diagramEngines: DiagramEngine[] = [
  {
    id: "structurizr",
    shortId: "dsl",
    label: "Structurizr DSL",
    canRender: true,
    renderFormats: ["svg", "png"],
    themes: [
      { id: "default", label: "Default" },
      { id: "enterprise", label: "Enterprise" }
    ],
    generate: generateStructurizr
  },
  {
    id: "mermaid",
    shortId: "mmd",
    label: "Mermaid",
    canRender: true,
    renderFormats: ["svg", "png"],
    themes: [
      { id: "default", label: "Default" },
      { id: "neutral", label: "Neutral" }
    ],
    generate: generateMermaid
  }
];
