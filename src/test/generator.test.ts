import { test, expect } from "vitest";
import sample from "../../samples/sample1.json";
import sample2 from "../../samples/sample2.json";
import { parseArcGisReport } from "@/parsers/arcgis-report-parser";
import { normalizeReport } from "@/parsers/normalize";
import generateAll from "@/features/generate/generate-service";

test("generators produce artifacts for sample1", async () => {
  const parsed = parseArcGisReport(sample as any);
  const model = normalizeReport(parsed).model;
  const arts = await generateAll(model, "neutral");

  const mer = arts.find(a => a.engineId === "mermaid");
  const str = arts.find(a => a.engineId === "structurizr");

  expect(mer).toBeDefined();
  expect(str).toBeDefined();
  expect(mer!.fileExtension).toBe(".mmd");
  expect(str!.fileExtension).toBe(".dsl");
  expect(mer!.content as string).toContain("flowchart LR");
  expect(mer!.viewContents?.container).toContain("subgraph WEB_TIER");
  expect(mer!.viewContents?.deployment).toContain("ENVY.KAAHMA.WORLD");
  expect(mer!.viewContents?.deployment).not.toContain("subgraph WEB_TIER");
  expect(mer!.viewContents?.deployment).not.toContain("subgraph APP_TIER");
  expect(mer!.viewContents?.deployment).not.toContain("subgraph DATA_TIER");
  expect(mer!.files?.map((f) => f.name)).toEqual([
    "diagram-container.mmd",
    "diagram-deployment.mmd",
    "diagram-preview.md"
  ]);
  expect(str!.content as string).toMatch(/container arcgis containerView/i);
  expect(str!.content as string).not.toContain("deploymentNode \"Web Tier\"");
  expect(str!.content as string).toMatch(/deploymentNode \"[^\"]+\" \{\n\s+containerInstance /m);
  expect(str!.viewContents?.container).toContain("container arcgis containerView");
  expect(str!.viewContents?.deployment).toContain("deployment arcgis production deploymentView");
});

test("same input + same theme yields byte-identical output", async () => {
  const parsed = parseArcGisReport(sample2 as any);
  const model = normalizeReport(parsed).model;

  const first = await generateAll(model, "neutral");
  const second = await generateAll(model, "neutral");

  const firstMermaid = first.find((a) => a.engineId === "mermaid")?.content;
  const secondMermaid = second.find((a) => a.engineId === "mermaid")?.content;
  const firstStructurizr = first.find((a) => a.engineId === "structurizr")?.content;
  const secondStructurizr = second.find((a) => a.engineId === "structurizr")?.content;

  expect(firstMermaid).toBeDefined();
  expect(secondMermaid).toBeDefined();
  expect(firstStructurizr).toBeDefined();
  expect(secondStructurizr).toBeDefined();

  expect(firstMermaid).toBe(secondMermaid);
  expect(firstStructurizr).toBe(secondStructurizr);
});

test("structurizr enterprise theme emits custom styling", async () => {
  const parsed = parseArcGisReport(sample as any);
  const model = normalizeReport(parsed).model;
  const arts = await generateAll(model, "enterprise");
  const structurizr = arts.find((a) => a.engineId === "structurizr");

  expect(structurizr).toBeDefined();
  expect(structurizr!.content as string).toContain(`theme default`);
  expect(structurizr!.content as string).toContain(`styles {`);
  expect(structurizr!.content as string).toContain(`element "Container" {`);
  expect(structurizr!.content as string).toContain(`shape RoundedBox`);
  expect(structurizr!.viewContents?.container).toContain(`styles {`);
  expect(structurizr!.viewContents?.deployment).toContain(`styles {`);
});
