import { describe, expect, it } from "vitest";
import { vi } from "vitest";
import JSZip from "jszip";
import { buildZipFilename } from "@/utils/file-naming";
import { buildReadme } from "@/features/download/readme-builder";
import { downloadZip } from "@/features/download/zip-builder";

const saveAsSpy = vi.fn();

vi.mock("file-saver", () => ({
  saveAs: (...args: unknown[]) => saveAsSpy(...args)
}));

describe("download utilities", () => {
  it("uses slug20 and local timestamp", () => {
    const at = new Date(2026, 2, 6, 14, 5);
    const file = buildZipFilename("My Deployment Name Is Very Long", "dsl", at);
    expect(file).toBe("my-deployment-name-i__dsl_202603061405.zip");
  });

  it("builds README with metadata and disclaimer", () => {
    const readme = buildReadme(
      {
        deploymentName: "Prod East",
        description: "Primary deployment",
        userName: "Alex",
        email: "alex@example.com",
        phone: "555-0100"
      },
      "Structurizr DSL",
      new Date("2026-03-06T14:05:00")
    );

    expect(readme).toContain("# Prod East - Structurizr DSL");
    expect(readme).toContain("## Metadata");
    expect(readme).toContain("- Deployment Name: Prod East");
    expect(readme).toContain("## Disclaimer");
    expect(readme).toContain("Use at your own risk.");
  });

  it("creates zip with README.md and all mermaid outputs", async () => {
    saveAsSpy.mockReset();

    await downloadZip({
      deploymentName: "Prod East",
      engineShortId: "mmd",
      readme: "# test readme",
      artifact: {
        engineId: "mermaid",
        fileExtension: ".mmd",
        mimeType: "text/plain",
        content: "flowchart LR\nA-->B",
        files: [
          { name: "diagram-container.mmd", mimeType: "text/plain", content: "flowchart LR\nA-->B" },
          { name: "diagram-deployment.mmd", mimeType: "text/plain", content: "flowchart LR\nM-->N" },
          { name: "diagram-preview.md", mimeType: "text/markdown", content: "# Preview" }
        ]
      },
      generatedAt: new Date(2026, 2, 6, 14, 5)
    });

    expect(saveAsSpy).toHaveBeenCalledTimes(1);

    const [blob, fileName] = saveAsSpy.mock.calls[0] as [Blob, string];
    expect(fileName).toBe("prod-east__mmd_202603061405.zip");

    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    const names = Object.keys(zip.files);
    expect(names).toContain("README.md");
    expect(names).toContain("diagram-container.mmd");
    expect(names).toContain("diagram-deployment.mmd");
    expect(names).toContain("diagram-preview.md");
  });
});
