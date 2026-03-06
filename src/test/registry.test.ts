import { describe, expect, it } from "vitest";
import { diagramEngines } from "@/config/diagram-options";
import { DiagramRegistry } from "@/engines/registry";

describe("diagram registry", () => {
  it("loads both MVP engines", () => {
    const registry = new DiagramRegistry(diagramEngines);
    expect(registry.all().map((e) => e.id)).toEqual(["structurizr", "mermaid"]);
  });

  it("exposes capability metadata", () => {
    const registry = new DiagramRegistry(diagramEngines);
    expect(registry.get("mermaid").renderFormats).toContain("svg");
  });
});
