import { test, expect } from "vitest";
import { initialJob } from "@/domain/job";
import { setJobs, getJobs, removeJob, clearJobs } from "@/services/job-service";

test("removeJob removes a specific job", () => {
  setJobs([]);
  const j = initialJob("mermaid", "neutral");
  setJobs([j]);
  expect(getJobs().length).toBe(1);
  removeJob(j.id);
  expect(getJobs().length).toBe(0);
});

test("clearJobs removes all jobs", () => {
  setJobs([]);
  const a = initialJob("mermaid", "neutral");
  const b = initialJob("structurizr", "default");
  setJobs([a, b]);
  expect(getJobs().length).toBe(2);
  clearJobs();
  expect(getJobs().length).toBe(0);
});
