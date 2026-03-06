import { describe, expect, it } from "vitest";
import { toDeploymentSlug } from "@/utils/slug";
import { validateDeploymentName, validateEmail } from "@/utils/validation";

describe("validation", () => {
  it("accepts 100-char deployment name", () => {
    const name = "A".repeat(100);
    expect(validateDeploymentName(name)).toBeNull();
  });

  it("rejects 101-char deployment name", () => {
    const name = "A".repeat(101);
    expect(validateDeploymentName(name)).toMatch(/100/);
  });

  it("accepts spaces and hyphens", () => {
    expect(validateDeploymentName("Env Prod-East 01")).toBeNull();
  });

  it("validates optional email", () => {
    expect(validateEmail("")).toBeNull();
    expect(validateEmail("bad")).toMatch(/invalid/i);
  });

  it("normalizes slug for filenames", () => {
    expect(toDeploymentSlug("My Deployment - East", 20)).toBe("my-deployment-east");
  });
});
