import { test, expect } from "vitest";
import { buildZip, buildReadme } from "@/features/package/zip-service";
import JSZip from "jszip";

const artifacts = [
  { engineId: "mermaid", fileExtension: ".mmd", mimeType: "text/plain", content: "flowchart LR" },
  { engineId: "structurizr", fileExtension: ".dsl", mimeType: "text/plain", content: "workspace { }" }
];

const metadata = { deploymentName: "Test", description: "desc", userName: "me", email: "me@example.com", phone: "" };

test("buildReadme includes deployment name", () => {
  const md = buildReadme(metadata as any, artifacts as any);
  expect(md).toContain("Test");
  expect(md).toContain("mermaid.mmd");
});

test("buildZip creates archive with files", async () => {
  const buf = await buildZip(artifacts as any, metadata as any);
  const zip = await JSZip.loadAsync(buf);
  const names = Object.keys(zip.files);
  expect(names).toContain("README.md");
  expect(names).toContain("mermaid.mmd");
  expect(names).toContain("structurizr.dsl");
});
