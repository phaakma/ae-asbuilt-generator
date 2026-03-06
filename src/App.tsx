import { useEffect, useMemo, useRef, useState } from "react";
import { diagramEngines } from "@/config/diagram-options";
import { loadRuntimeConfig, type RuntimeConfig } from "@/config/runtime-config";
import type { DiagramEngineId, DiagramViewId } from "@/domain/diagram";
import type { NormalizedDeployment } from "@/domain/deployment-model";
import FileUpload from "@/features/upload/FileUpload";
import MetadataForm, { type Metadata } from "@/features/metadata/MetadataForm";
import DiagramOptionsTable from "@/features/options/DiagramOptionsTable";
import { initialJob, type EngineJob } from "@/features/jobs/job-state";
import { buildRenderUrl, openRenderTab } from "@/features/render/render-service";
import { generateArtifact } from "@/features/generate/generate-service";
import { buildReadme } from "@/features/download/readme-builder";
import { downloadZip } from "@/features/download/zip-builder";
import { validateDeploymentName, validateEmail } from "@/utils/validation";

const initialMetadata: Metadata = {
  deploymentName: "",
  description: "",
  userName: "",
  email: "",
  phone: ""
};

const defaultRuntimeConfig: RuntimeConfig = {
  krokiEndpoint: "https://kroki.io",
  diagramOptions: {
    structurizr: { active: true },
    mermaid: { active: true }
  }
};

export default function App() {
  const inputRevisionRef = useRef(0);
  const [runtimeConfig, setRuntimeConfig] = useState<RuntimeConfig>(defaultRuntimeConfig);
  const [deployment, setDeployment] = useState<NormalizedDeployment | null>(null);
  const [metadata, setMetadata] = useState<Metadata>(initialMetadata);
  const [metadataValid, setMetadataValid] = useState(false);
  const [jobs, setJobs] = useState<Record<string, EngineJob>>(() =>
    Object.fromEntries(diagramEngines.map((engine) => [engine.id, initialJob(engine.id, engine.themes[0].id)]))
  );

  useEffect(() => {
    loadRuntimeConfig().then(setRuntimeConfig);
  }, []);

  const activeEngines = useMemo(
    () => diagramEngines.filter((engine) => runtimeConfig.diagramOptions[engine.id]?.active !== false),
    [runtimeConfig]
  );

  const resetJobs = () => {
    setJobs((prev) =>
      Object.fromEntries(
        diagramEngines.map((engine) => {
          const current = prev[engine.id] ?? initialJob(engine.id, engine.themes[0].id);
          return [
            engine.id,
            {
              ...current,
              status: "idle",
              artifact: null,
              error: ""
            }
          ];
        })
      )
    );
  };

  const generateForAction = (engineId: string): ReturnType<typeof generateArtifact> | null => {
    if (!deployment || !metadataValid) {
      return null;
    }

    const selectedThemeId = jobs[engineId]?.themeId;
    if (!selectedThemeId) {
      return null;
    }

    setJobs((prev) => ({
      ...prev,
      [engineId]: { ...prev[engineId], status: "generating", error: "" }
    }));

    try {
      const artifact = generateArtifact(engineId as DiagramEngineId, deployment, selectedThemeId);
      setJobs((prev) => ({
        ...prev,
        [engineId]: {
          ...prev[engineId],
          status: "success",
          artifact
        }
      }));
      return artifact;
    } catch (error) {
      const message = error instanceof Error && error.message ? error.message : "Generation failed";
      setJobs((prev) => ({
        ...prev,
        [engineId]: { ...prev[engineId], status: "error", error: message, artifact: null }
      }));
      return null;
    }
  };

  const onDownload = async (engineId: string) => {
    const engine = diagramEngines.find((item) => item.id === engineId);
    if (!engine) {
      return;
    }

    const artifact = generateForAction(engineId);
    if (!artifact) {
      return;
    }

    await downloadZip({
      deploymentName: metadata.deploymentName,
      engineShortId: engine.shortId,
      readme: buildReadme(metadata, engine.label, new Date()),
      artifact,
      generatedAt: new Date()
    });
  };

  const onRender = async (engineId: string, renderView: DiagramViewId) => {
    const artifact = generateForAction(engineId);
    if (!artifact) {
      return;
    }
    const renderFormat = jobs[engineId]?.renderFormat ?? "svg";
    const url = await buildRenderUrl(artifact, renderFormat, runtimeConfig.krokiEndpoint, renderView);
    openRenderTab(url);
  };

  return (
    <main className="app-shell">
      <header className="app-header">
        <p className="app-eyebrow">ArcGIS Enterprise</p>
        <h1>As-Built Diagram Generator</h1>
        <p className="app-subtitle">
          Upload a system report, complete deployment metadata, and generate exportable diagram artifacts.
        </p>
      </header>

      <section className="app-instructions" aria-label="Usage instructions">
        <p className="app-instructions__title">Instructions:</p>
        <p>
          First, retrieve from your Portal for ArcGIS the system report JSON file. This is available from ArcGIS
          Enterprise v11.5 deployments onwards, on the Organization page in the About section. You will need to
          be logged in as an administrator to access that section. At the bottom of that page is a link to
          download the system details as a JSON file.
        </p>
        <p>
          Once you have that JSON file, you can either upload it here or copy/paste the contents into the text
          area below.
        </p>
        <p>
          This web application does not save or retain any data, and no telemetry is collected. However, clicking
          any of the rendering buttons submits a copy of the generated diagram file to the public Kroki web
          service (https://kroki.io/) to render as the chosen format. If you prefer not to use the public Kroki API, you can use the Download button to download the raw diagram files and render them locally
          yourself.
        </p>
      </section>

      <section className="app-grid" aria-label="Input configuration">
        <calcite-panel heading="Deployment Metadata" class="app-card" icon="user">
          <MetadataForm
            value={metadata}
            onChange={(next, valid) => {
              setMetadata(next);
              setMetadataValid(valid);
            }}
          />
        </calcite-panel>

        <calcite-panel heading="System Report" class="app-card" icon="file-json">
          <FileUpload
            metadataValid={metadataValid}
            onLoaded={(nextDeployment, suggestedDeploymentName) => {
              inputRevisionRef.current += 1;
              setDeployment(nextDeployment);
              resetJobs();

              if (!suggestedDeploymentName) {
                return;
              }

              setMetadata((prev) => {
                if (prev.deploymentName.trim()) {
                  return prev;
                }

                const nextMetadata = { ...prev, deploymentName: suggestedDeploymentName };
                setMetadataValid(
                  !validateDeploymentName(nextMetadata.deploymentName) && !validateEmail(nextMetadata.email)
                );
                return nextMetadata;
              });
            }}
          />
        </calcite-panel>
      </section>

      <calcite-panel heading="Diagram Engines" class="app-card app-card--full" icon="diagram">
        <DiagramOptionsTable
          engines={activeEngines}
          jobs={jobs}
          onThemeChange={(engineId, themeId) => {
            setJobs((prev) => ({ ...prev, [engineId]: { ...prev[engineId], themeId } }));
          }}
          onRenderFormatChange={(engineId, renderFormat) => {
            setJobs((prev) => ({ ...prev, [engineId]: { ...prev[engineId], renderFormat } }));
          }}
          canGenerate={Boolean(deployment) && metadataValid}
          onDownload={onDownload}
          onRender={onRender}
        />
      </calcite-panel>
    </main>
  );
}
