import { test, expect } from "vitest";
import { initialJob } from "@/domain/job";
import { setJobs, getJobs, updateJob } from "@/services/job-service";

test("job service lifecycle", () => {
  setJobs([]);
  const job = initialJob("mermaid", "neutral");
  setJobs([job]);
  expect(getJobs().length).toBe(1);
  updateJob(job.id, { status: "queued" });
  expect(getJobs()[0].status).toBe("queued");
  updateJob(job.id, { status: "running" });
  expect(getJobs()[0].status).toBe("running");
  updateJob(job.id, { status: "done", artifact: "out.mmd" });
  expect(getJobs()[0].status).toBe("done");
  expect(getJobs()[0].artifact).toBe("out.mmd");
});
