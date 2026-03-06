import { describe, expect, it } from "vitest";
import { buildRenderUrl } from "@/features/render/render-service";

describe("render service", () => {
  it("builds kroki url for mermaid", async () => {
    const url = await buildRenderUrl(
      {
        engineId: "mermaid",
        fileExtension: ".mmd",
        mimeType: "text/plain",
        content: "flowchart LR\nA-->B"
      },
      "svg",
      "https://kroki.io"
    );

    expect(url.startsWith("https://kroki.io/mermaid/svg/")).toBe(true);
    const source = url.split("/").at(-1) ?? "";
    expect(source.includes("%")).toBe(false);
    expect(source.includes("+")).toBe(false);
    expect(source.includes("/")).toBe(false);
  });

  it("uses selected view content when provided", async () => {
    const containerUrl = await buildRenderUrl(
      {
        engineId: "structurizr",
        fileExtension: ".dsl",
        mimeType: "text/plain",
        content: "workspace { container }",
        viewContents: {
          container: "container-view-source",
          deployment: "deployment-view-source"
        }
      },
      "svg",
      "https://kroki.io",
      "container"
    );

    const deploymentUrl = await buildRenderUrl(
      {
        engineId: "structurizr",
        fileExtension: ".dsl",
        mimeType: "text/plain",
        content: "workspace { container }",
        viewContents: {
          container: "container-view-source",
          deployment: "deployment-view-source"
        }
      },
      "svg",
      "https://kroki.io",
      "deployment"
    );

    expect(containerUrl).not.toBe(deploymentUrl);
  });
});
