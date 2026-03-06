import { describe, expect, it, vi, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import App from "@/App";

const mockDeployment = { id: "deployment" } as any;

vi.mock("@/features/upload/FileUpload", () => ({
  default: ({ onLoaded }: { onLoaded: (deployment: unknown, suggestedDeploymentName?: string) => void }) => (
    <section>
      <button onClick={() => onLoaded(mockDeployment, "uploaded-report")}>Upload Valid</button>
      <button onClick={() => onLoaded(mockDeployment)}>Edit JSON</button>
      <button onClick={() => onLoaded(null)}>Invalidate JSON</button>
    </section>
  )
}));

vi.mock("@/config/runtime-config", () => ({
  loadRuntimeConfig: vi.fn(async () => ({
    krokiEndpoint: "https://kroki.io",
    diagramOptions: {
      structurizr: { active: true },
      mermaid: { active: true }
    }
  }))
}));

vi.mock("@/features/generate/generate-service", () => ({
  generateArtifact: vi.fn(() => ({
    engineId: "mermaid",
    fileExtension: ".mmd",
    mimeType: "text/plain",
    content: "flowchart LR\nA-->B"
  }))
}));

describe("App flow", () => {
  afterEach(() => {
    cleanup();
  });

  it("defaults deployment name from uploaded filename", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Upload Valid" }));

    const input = document.getElementById("deploymentName") as HTMLInputElement;
    expect(input.value).toBe("uploaded-report");
  });

  it("keeps an existing deployment name when uploading a file", () => {
    render(<App />);

    const input = document.getElementById("deploymentName") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "custom-name" } });

    fireEvent.click(screen.getByRole("button", { name: "Upload Valid" }));

    expect(input.value).toBe("custom-name");
  });

  it("enables and disables action buttons based on input validity", async () => {
    render(<App />);

    const getButtonsByLabel = (label: string) =>
      Array.from(document.querySelectorAll("calcite-button")).filter((button) =>
        button.textContent?.trim().includes(label)
      ) as any[];
    const isEnabled = (button: Element) => button.getAttribute("disabled") === "false";

    expect(getButtonsByLabel("Download").every((button) => !isEnabled(button))).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "Upload Valid" }));

    await waitFor(() => {
      expect(getButtonsByLabel("Download").some((button) => isEnabled(button))).toBe(true);
    });

    fireEvent.click(screen.getByRole("button", { name: "Edit JSON" }));

    expect(getButtonsByLabel("Download").some((button) => isEnabled(button))).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "Invalidate JSON" }));

    await waitFor(() => {
      expect(getButtonsByLabel("Download").every((button) => !isEnabled(button))).toBe(true);
    });
  });

  it("does not show a Generate action button", () => {
    render(<App />);

    const generateButton = Array.from(document.querySelectorAll("calcite-button")).find(
      (button) => button.textContent?.trim() === "Generate"
    );

    expect(generateButton).toBeUndefined();
  });
});
