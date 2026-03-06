import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import DiagramOptionsTable from "@/features/options/DiagramOptionsTable";
import type { DiagramEngine } from "@/domain/diagram";
import type { EngineJob } from "@/features/jobs/job-state";

describe("DiagramOptionsTable render formats", () => {
  afterEach(() => {
    cleanup();
  });

  it("shows unsupported formats as disabled options", () => {
    const engines: DiagramEngine[] = [
      {
        id: "mermaid",
        shortId: "mmd",
        label: "Mermaid",
        canRender: true,
        renderFormats: ["svg"],
        themes: [{ id: "default", label: "Default" }],
        generate: () => ({
          engineId: "mermaid",
          fileExtension: ".mmd",
          mimeType: "text/plain",
          content: ""
        })
      }
    ];

    const jobs: Record<string, EngineJob> = {
      mermaid: {
        engineId: "mermaid",
        status: "success",
        artifact: {
          engineId: "mermaid",
          fileExtension: ".mmd",
          mimeType: "text/plain",
          content: "flowchart LR\nA-->B"
        },
        error: "",
        themeId: "default",
        renderFormat: "png",
        renderView: "container"
      }
    };

    render(
      <DiagramOptionsTable
        engines={engines}
        jobs={jobs}
        canGenerate={true}
        onThemeChange={vi.fn()}
        onRenderFormatChange={vi.fn()}
        onDownload={vi.fn()}
        onRender={vi.fn()}
      />
    );

    const formatSelect = screen.getByLabelText("Mermaid render format") as HTMLSelectElement;
    expect(formatSelect.value).toBe("svg");

    const svgOption = screen.getByRole("option", { name: "svg" }) as HTMLOptionElement;
    const pngOption = screen.getByRole("option", { name: "png" }) as HTMLOptionElement;

    expect(svgOption.disabled).toBe(false);
    expect(pngOption.disabled).toBe(true);
  });

  it("does not render status column and shows generation errors", () => {
    const engines: DiagramEngine[] = [
      {
        id: "mermaid",
        shortId: "mmd",
        label: "Mermaid",
        canRender: true,
        renderFormats: ["svg"],
        themes: [{ id: "default", label: "Default" }],
        generate: () => ({
          engineId: "mermaid",
          fileExtension: ".mmd",
          mimeType: "text/plain",
          content: ""
        })
      }
    ];

    const jobs: Record<string, EngineJob> = {
      mermaid: {
        engineId: "mermaid",
        status: "error",
        artifact: null,
        error: "Generation failed for Mermaid",
        themeId: "default",
        renderFormat: "svg",
        renderView: "container"
      }
    };

    render(
      <DiagramOptionsTable
        engines={engines}
        jobs={jobs}
        canGenerate={true}
        onThemeChange={vi.fn()}
        onRenderFormatChange={vi.fn()}
        onDownload={vi.fn()}
        onRender={vi.fn()}
      />
    );

    expect(screen.queryByRole("columnheader", { name: "Status" })).toBeNull();
    expect(screen.getByRole("alert").textContent).toContain("Generation failed for Mermaid");
  });

  it("disables download and render actions when prerequisites are not met", () => {
    const engines: DiagramEngine[] = [
      {
        id: "mermaid",
        shortId: "mmd",
        label: "Mermaid",
        canRender: true,
        renderFormats: ["svg"],
        themes: [{ id: "default", label: "Default" }],
        generate: () => ({
          engineId: "mermaid",
          fileExtension: ".mmd",
          mimeType: "text/plain",
          content: ""
        })
      }
    ];

    const jobs: Record<string, EngineJob> = {
      mermaid: {
        engineId: "mermaid",
        status: "idle",
        artifact: null,
        error: "",
        themeId: "default",
        renderFormat: "svg",
        renderView: "container"
      }
    };

    render(
      <DiagramOptionsTable
        engines={engines}
        jobs={jobs}
        canGenerate={false}
        onThemeChange={vi.fn()}
        onRenderFormatChange={vi.fn()}
        onDownload={vi.fn()}
        onRender={vi.fn()}
      />
    );

    const actionButtons = Array.from(document.querySelectorAll("calcite-button"));
    const downloadButton = actionButtons.find((button) => button.textContent?.trim() === "Download");
    const containerButton = actionButtons.find((button) => button.textContent?.trim() === "Container");
    const deploymentButton = actionButtons.find((button) => button.textContent?.trim() === "Deployment");

    expect(downloadButton?.hasAttribute("disabled")).toBe(true);
    expect(containerButton?.hasAttribute("disabled")).toBe(true);
    expect(deploymentButton?.hasAttribute("disabled")).toBe(true);
  });

  it("renders container and deployment action buttons", () => {
    const onRender = vi.fn();
    const engines: DiagramEngine[] = [
      {
        id: "structurizr",
        shortId: "dsl",
        label: "Structurizr DSL",
        canRender: true,
        renderFormats: ["svg", "png"],
        themes: [{ id: "default", label: "Default" }],
        generate: () => ({
          engineId: "structurizr",
          fileExtension: ".dsl",
          mimeType: "text/plain",
          content: "workspace {}"
        })
      }
    ];

    const jobs: Record<string, EngineJob> = {
      structurizr: {
        engineId: "structurizr",
        status: "success",
        artifact: {
          engineId: "structurizr",
          fileExtension: ".dsl",
          mimeType: "text/plain",
          content: "workspace {}"
        },
        error: "",
        themeId: "default",
        renderFormat: "svg",
        renderView: "container"
      }
    };

    render(
      <DiagramOptionsTable
        engines={engines}
        jobs={jobs}
        canGenerate={true}
        onThemeChange={vi.fn()}
        onRenderFormatChange={vi.fn()}
        onDownload={vi.fn()}
        onRender={onRender}
      />
    );

    const actionButtons = Array.from(document.querySelectorAll("calcite-button")) as HTMLElement[];
    const containerButton = actionButtons.find((button) => button.textContent?.trim() === "Container");
    const deploymentButton = actionButtons.find((button) => button.textContent?.trim() === "Deployment");

    expect(containerButton).toBeTruthy();
    expect(deploymentButton).toBeTruthy();

    fireEvent.click(containerButton as HTMLElement);
    expect(onRender).toHaveBeenCalledWith("structurizr", "container");

    fireEvent.click(deploymentButton as HTMLElement);
    expect(onRender).toHaveBeenCalledWith("structurizr", "deployment");
  });
});
