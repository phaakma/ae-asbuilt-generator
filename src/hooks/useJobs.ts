import { useSyncExternalStore } from "react";
import { getJobs, subscribe } from "@/services/job-service";

export default function useJobs() {
  return useSyncExternalStore(subscribe, () => getJobs(), () => getJobs());
}
