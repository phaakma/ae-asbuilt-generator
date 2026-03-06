import type { DiagramJob } from "@/domain/job";

const STORAGE_KEY = "asbuilt.jobs.v1";

function dataURLToBlob(dataUrl: string) {
  const parts = dataUrl.split(",");
  const meta = parts[0];
  const b64 = parts[1] || "";
  const m = /data:(.*?);base64/.exec(meta);
  const mime = m ? m[1] : "application/octet-stream";
  const binary = atob(b64);
  const len = binary.length;
  const arr = new Uint8Array(len);
  for (let i = 0; i < len; i++) arr[i] = binary.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

// Use a global singleton so HMR or duplicate module instances share the same store
type Store = {
  jobs: DiagramJob[];
  listeners: Array<() => void>;
};

const G = globalThis as any;
if (!G.__ASBUILT_JOB_STORE__) {
  G.__ASBUILT_JOB_STORE__ = { jobs: [], listeners: [] } as Store;
}
const store: Store = G.__ASBUILT_JOB_STORE__;

let jobs = store.jobs;
const listeners = store.listeners;

function commit(nextJobs: DiagramJob[]) {
  jobs = nextJobs;
  store.jobs = nextJobs;
}

function persist() {
  try {
    // persist without runtime object URLs
    const toPersist = jobs.map((j) => {
      const { artifact, ...rest } = j;
      return rest;
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toPersist));
  } catch (_e) {
    // ignore persistence errors
  }
}

function restore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      commit([]);
      return;
    }
    const arr = JSON.parse(raw) as DiagramJob[];
    const restored = arr.map((j) => ({ ...j }));
    // recreate object URLs for any artifactData
    for (const j of restored) {
      if (j.artifactData) {
        try {
          const blob = dataURLToBlob(j.artifactData);
          j.artifact = URL.createObjectURL(blob);
        } catch (_e) {
          // skip
        }
      }
    }
    commit(restored);
  } catch (_e) {
    commit([]);
  }
}

// initialize from storage
restore();

export function getJobs() {
  return jobs;
}

export function subscribe(fn: () => void) {
  listeners.push(fn);
  return () => {
    const idx = listeners.indexOf(fn);
    if (idx !== -1) listeners.splice(idx, 1);
  };
}

function notify() {
  // debug: log number of listeners before notifying
  try {
    // eslint-disable-next-line no-console
    console.debug(`job-service: notifying ${listeners.length} listeners`);
  } catch (_e) {}
  for (const l of listeners) l();
  try {
    // also dispatch a global window event so different module instances can observe
    window.dispatchEvent(new CustomEvent("asbuilt.jobs.update"));
  } catch (_e) {}
}

export function setJobs(next: DiagramJob[]) {
  // revoke previous blob URLs
  for (const j of jobs) {
    if (j.artifact && j.artifact.startsWith("blob:")) {
      try {
        URL.revokeObjectURL(j.artifact);
      } catch (_e) {}
    }
  }
  commit(next.map((j) => ({ ...j })));
  persist();
  notify();
}

export function updateJob(id: string, patch: Partial<DiagramJob>) {
  const idx = jobs.findIndex((j) => j.id === id);
  if (idx === -1) {
    console.warn(`job-service.updateJob: job not found: ${id} (jobs=${jobs.map(j=>j.id).join(',')})`);
    return;
  }
  const current = jobs[idx];
  const nextJob = { ...current, ...patch };
  const nextJobs = [...jobs];
  nextJobs[idx] = nextJob;
  commit(nextJobs);
  persist();
  // debug: log update
  try {
    // eslint-disable-next-line no-console
    console.debug(`job-service.updateJob: updated ${id} -> ${JSON.stringify(patch)}`);
  } catch (_e) {}
  notify();
}

export function getListenerCount() {
  return listeners.length;
}


export function removeJob(id: string) {
  const j = jobs.find((job) => job.id === id);
  if (!j) return;
  if (j.artifact && j.artifact.startsWith("blob:")) {
    try {
      URL.revokeObjectURL(j.artifact);
    } catch (_e) {}
  }
  commit(jobs.filter((job) => job.id !== id));
  persist();
  notify();
}

export function clearJobs() {
  for (const j of jobs) {
    if (j.artifact && j.artifact.startsWith("blob:")) {
      try {
        URL.revokeObjectURL(j.artifact);
      } catch (_e) {}
    }
  }
  commit([]);
  persist();
  notify();
}

export default { getJobs, setJobs, updateJob };
