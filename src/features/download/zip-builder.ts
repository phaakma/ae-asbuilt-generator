import JSZip from "jszip";
import { saveAs } from "file-saver";
import type { DiagramArtifact } from "@/domain/diagram";
import { buildZipFilename } from "@/utils/file-naming";

export async function downloadZip(args: {
  deploymentName: string;
  engineShortId: string;
  readme: string;
  artifact: DiagramArtifact;
  generatedAt: Date;
}): Promise<void> {
  const zip = new JSZip();
  zip.file("README.md", args.readme);

  const files = args.artifact.files;
  if (files?.length) {
    for (const file of files) {
      zip.file(file.name, file.content);
    }
  } else {
    zip.file(`diagram${args.artifact.fileExtension}`, args.artifact.content);
  }

  const blob = await zip.generateAsync({ type: "blob" });
  const fileName = buildZipFilename(args.deploymentName, args.engineShortId, args.generatedAt);
  saveAs(blob, fileName);
}
