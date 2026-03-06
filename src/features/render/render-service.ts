import type { DiagramArtifact, DiagramViewId } from "@/domain/diagram";
import type { NormalizedDeployment } from "@/domain/deployment-model";
import generateAll from "@/features/generate/generate-service";
import pako from "pako";

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

function textEncode(str: string): Uint8Array {
  if (typeof TextEncoder !== "undefined") {
    return new TextEncoder().encode(str);
  }
  const utf8 = unescape(encodeURIComponent(str));
  const result = new Uint8Array(utf8.length);
  for (let i = 0; i < utf8.length; i++) {
    result[i] = utf8.charCodeAt(i);
  }
  return result;
}

function encodeForKroki(source: string): string {
  const data = textEncode(source);
  const compressed = pako.deflate(data, { level: 9 });
  return bytesToBase64(compressed).replace(/\+/g, "-").replace(/\//g, "_");
}

function toKrokiType(engineId: string): string {
  if (engineId === "mermaid") {
    return "mermaid";
  }
  return "structurizr";
}

export async function buildRenderUrl(
  artifact: DiagramArtifact,
  format: "svg" | "png",
  krokiEndpoint: string,
  view: DiagramViewId = artifact.defaultView || "container"
): Promise<string> {
  const type = toKrokiType(artifact.engineId);
  const source = artifact.viewContents?.[view] || artifact.content;
  const encoded = encodeForKroki(source);
  const baseEndpoint = krokiEndpoint.replace(/\/$/, "");
  return `${baseEndpoint}/${type}/${format}/${encoded}`;
}

export function openRenderTab(url: string): void {
  window.open(url, "_blank", "noopener,noreferrer");
}

export async function renderEngineInNewTab(
  engineId: string,
  themeId: string,
  deployment: NormalizedDeployment,
  options?: { krokiEndpoint?: string; format?: "svg" | "png"; view?: DiagramViewId }
) {
  const artifacts = await generateAll(deployment, themeId);
  const art = artifacts.find((a) => a.engineId === engineId);
  if (!art) throw new Error("Artifact not found for engine: " + engineId);
  const url = await buildRenderUrl(
    art,
    options?.format ?? "svg",
    options?.krokiEndpoint ?? "https://kroki.io",
    options?.view ?? art.defaultView ?? "container"
  );
  openRenderTab(url);
}

export default renderEngineInNewTab;
