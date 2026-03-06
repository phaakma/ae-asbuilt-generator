import type { DiagramJob } from "@/domain/job";
import { updateJob } from "@/services/job-service";
import generateAll from "@/features/generate/generate-service";
import { buildZip } from "@/features/package/zip-service";

export async function processJob(job: DiagramJob, deployment: unknown, metadata: unknown) {
  console.log(`processJob start ${job.id}`);
  updateJob(job.id, { status: "queued" });
  // small delay to allow UI to show queued
  await new Promise((r) => setTimeout(r, 150));
  updateJob(job.id, { status: "running" });

  try {
    if (!deployment) throw new Error("No deployment provided");
    const artifacts = await generateAll(deployment, job.themeId || "default");
    const buf = await buildZip(artifacts, metadata as any);
    const blob = new Blob([new Uint8Array(buf as any)], { type: "application/zip" });
    const url = URL.createObjectURL(blob);
    // convert buffer to base64 data URL
    const bytes = new Uint8Array(buf as any);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    const dataUrl = "data:application/zip;base64," + btoa(binary);
    updateJob(job.id, { status: "done", artifact: url, artifactName: `${job.id}.zip`, artifactData: dataUrl });
    console.log(`processJob done ${job.id}`);
  } catch (err: any) {
    console.error(`processJob failed ${job.id}`, err);
    updateJob(job.id, { status: "failed", error: String(err) });
  }
}

export default processJob;
