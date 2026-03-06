import { useState, type ChangeEvent } from "react";
import { parseArcGisReport } from "@/parsers/arcgis-report-parser";
import { normalizeReport } from "@/parsers/normalize";
import type { NormalizedDeployment } from "@/domain/deployment-model";

type Props = {
  onLoaded: (deployment: NormalizedDeployment | null, suggestedDeploymentName?: string) => void;
  metadataValid: boolean;
};

export default function FileUpload({ onLoaded, metadataValid }: Props) {
  const [error, setError] = useState<string>("");
  const [jsonText, setJsonText] = useState("");
  const [jsonStatus, setJsonStatus] = useState<"empty" | "valid" | "invalid">("empty");

  function deploymentNameFromFile(fileName: string) {
    return fileName.replace(/\.json$/i, "");
  }

  function parseAndLoad(raw: string, suggestedDeploymentName?: string) {
    if (!raw.trim()) {
      onLoaded(null, suggestedDeploymentName);
      setError("");
      setJsonStatus("empty");
      return;
    }

    try {
      const parsed = parseArcGisReport(JSON.parse(raw));
      const normalized = normalizeReport(parsed);
      onLoaded(normalized.model, suggestedDeploymentName);
      setError("");
      setJsonStatus("valid");
    } catch {
      onLoaded(null, suggestedDeploymentName);
      setError("Invalid ArcGIS report JSON.");
      setJsonStatus("invalid");
    }
  }

  const onChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const raw = await file.text();
      setJsonText(raw);
      parseAndLoad(raw, deploymentNameFromFile(file.name));
    } catch {
      onLoaded(null);
      setError("Invalid ArcGIS report JSON.");
    }
  };

  const onTextInput = (raw: string) => {
    setJsonText(raw);
    parseAndLoad(raw);
  };

  const statusLabel =
    jsonStatus === "valid" ? "JSON valid" : jsonStatus === "invalid" ? "JSON invalid" : "Awaiting JSON input";
  const statusIcon = jsonStatus === "valid" ? "check-circle-f" : jsonStatus === "invalid" ? "x-circle-f" : "circle";
  const statusKind = jsonStatus === "valid" ? "success" : jsonStatus === "invalid" ? "danger" : "neutral";

  return (
    <section className="input-panel">
      <calcite-label class="input-panel__upload-label">
        Upload system report JSON
        <input id="report" type="file" accept="application/json" onChange={onChange} />
      </calcite-label>

      <div className="json-editor__header">
        <h3 id="report-json-title">System report JSON</h3>
        <calcite-chip
          icon={statusIcon}
          kind={statusKind}
          scale="m"
          class="json-editor__status-chip"
          label="JSON parse status"
          aria-live="polite"
        >
          {statusLabel}
        </calcite-chip>
      </div>

      <textarea
        id="report-json"
        value={jsonText}
        onChange={(event) => onTextInput(event.target.value)}
        rows={14}
        spellCheck={false}
        className="input-panel__json-text"
        placeholder="Paste your ArcGIS report JSON here, or upload a file above."
      />

      {!metadataValid ? (
        <p className="input-panel__hint">
          <calcite-icon icon="information-f" scale="s" aria-hidden="true" />
          Complete required metadata before generating diagrams.
        </p>
      ) : null}

      {error ? (
        <p role="alert" className="input-panel__error">
          <calcite-icon icon="x-circle-f" scale="s" aria-hidden="true" />
          {error}
        </p>
      ) : null}
    </section>
  );
}
