import type { Metadata } from "@/features/metadata/MetadataForm";

const DISCLAIMER = [
  "This tool generates architecture diagrams from user-supplied ArcGIS Enterprise system report JSON and optional metadata.",
  "Outputs are best-effort interpretations and may omit, simplify, or misrepresent environment details.",
  "You are responsible for validating all generated artifacts before operational, security, compliance, procurement, or architectural decisions.",
  'Use at your own risk. The authors and contributors provide this software and generated outputs "as is", without warranties of any kind, express or implied, including accuracy, fitness for a particular purpose, and non-infringement.',
  "Do not include sensitive or regulated information in metadata unless your organization permits it."
].join("\n");

export function buildReadme(metadata: Metadata, engineLabel: string, generatedAt: Date): string {
  return [
    `# ${metadata.deploymentName} - ${engineLabel}`,
    "",
    `Generated: ${generatedAt.toString()}`,
    "",
    "## Metadata",
    `- Deployment Name: ${metadata.deploymentName}`,
    `- Description: ${metadata.description || "(none)"}`,
    `- User Name: ${metadata.userName || "(none)"}`,
    `- Email: ${metadata.email || "(none)"}`,
    `- Phone: ${metadata.phone || "(none)"}`,
    "",
    "## Disclaimer",
    DISCLAIMER,
    ""
  ].join("\n");
}
