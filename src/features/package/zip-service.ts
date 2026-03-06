import JSZip from "jszip";
import type { DiagramArtifact } from "@/domain/diagram";
import type { Metadata } from "@/features/metadata/MetadataForm";

export function buildReadme(metadata: Metadata, artifacts: DiagramArtifact[]) {
  const lines: string[] = [];
  lines.push(`# ${metadata.deploymentName || "AsBuilt Diagrams"}`);
  if (metadata.description) lines.push(`\n${metadata.description}\n`);
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push(`Files:`);
  artifacts.forEach((a) => lines.push(`- ${a.engineId}${a.fileExtension} (${a.mimeType})`));
  lines.push(`\nMetadata:`);
  lines.push(`- User: ${metadata.userName || ""} <${metadata.email || ""}>`);
  return lines.join("\n");
}

export async function buildZip(artifacts: DiagramArtifact[], metadata: Metadata) {
  const zip = new JSZip();
  zip.file("README.md", buildReadme(metadata, artifacts));
  artifacts.forEach((a) => {
    const name = `${a.engineId}${a.fileExtension}`;
    zip.file(name, a.content);
  });

  // produce an ArrayBuffer (works in browser and node). Return Uint8Array for consistency.
  const ab = await zip.generateAsync({ type: "arraybuffer" });
  return new Uint8Array(ab);
}

export default { buildZip, buildReadme };
