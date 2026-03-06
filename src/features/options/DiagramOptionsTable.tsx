import type { DiagramEngine, DiagramViewId } from "@/domain/diagram";
import type { EngineJob } from "@/features/jobs/job-state";

const allRenderFormats: Array<"svg" | "png"> = ["svg", "png"];

type Props = {
  engines: DiagramEngine[];
  jobs: Record<string, EngineJob>;
  canGenerate: boolean;
  onThemeChange: (engineId: string, themeId: string) => void;
  onRenderFormatChange: (engineId: string, renderFormat: "svg" | "png") => void;
  onDownload: (engineId: string) => void;
  onRender: (engineId: string, renderView: DiagramViewId) => void;
};

export default function DiagramOptionsTable({
  engines,
  jobs,
  canGenerate,
  onThemeChange,
  onRenderFormatChange,
  onDownload,
  onRender
}: Props) {
  return (
    <table className="options-table">
      <thead>
        <tr>
          <th>Engine</th>
          <th>Theme</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {engines.map((engine) => {
          const job = jobs[engine.id];
          const supportsFormat = (format: "svg" | "png") => engine.renderFormats.includes(format);
          const selectedRenderFormat = supportsFormat(job.renderFormat)
            ? job.renderFormat
            : (engine.renderFormats[0] ?? "svg");
          const isGenerating = job.status === "generating";
          const canDownload = canGenerate;
          const canRender = canGenerate && engine.canRender && supportsFormat(selectedRenderFormat);

          return (
            <tr key={engine.id}>
              <td className="options-table__engine-cell">
                <span className="options-table__engine-name">{engine.label}</span>
                <span className="options-table__engine-id">{engine.id}</span>
              </td>
              <td>
                <select
                  className="options-table__select"
                  aria-label={`${engine.label} theme`}
                  value={job.themeId}
                  onChange={(e) => onThemeChange(engine.id, e.target.value)}
                  disabled={isGenerating}
                >
                  {engine.themes.map((theme) => (
                    <option key={theme.id} value={theme.id}>
                      {theme.label}
                    </option>
                  ))}
                </select>
              </td>
              <td className="options-table__actions">
                <div className="options-table__render-controls">
                  <div className="options-table__render-box">
                    <div className="options-table__render-row">
                      <label className="options-table__render-label" htmlFor={`${engine.id}-format`}>
                        Render
                      </label>
                      <select
                        id={`${engine.id}-format`}
                        className="options-table__select options-table__format-select"
                        aria-label={`${engine.label} render format`}
                        value={selectedRenderFormat}
                        onChange={(e) => {
                          const next = e.target.value as "svg" | "png";
                          if (supportsFormat(next)) {
                            onRenderFormatChange(engine.id, next);
                          }
                        }}
                        disabled={isGenerating || !engine.canRender || engine.renderFormats.length === 0}
                      >
                        {allRenderFormats.map((format) => (
                          <option key={format} value={format} disabled={!supportsFormat(format)}>
                            {format}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="options-table__view-buttons" role="group" aria-label={`${engine.label} render views`}>
                      <calcite-button
                        onClick={() => onRender(engine.id, "container")}
                        disabled={!canRender || isGenerating}
                        appearance="outline"
                        kind={engine.canRender ? "brand" : "neutral"}
                        icon-start="launch"
                      >
                        Container
                      </calcite-button>
                      <calcite-button
                        onClick={() => onRender(engine.id, "deployment")}
                        disabled={!canRender || isGenerating}
                        appearance="outline"
                        kind={engine.canRender ? "brand" : "neutral"}
                        icon-start="launch"
                      >
                        Deployment
                      </calcite-button>
                    </div>
                  </div>
                </div>

                <calcite-button
                  onClick={() => onDownload(engine.id)}
                  disabled={!canDownload || isGenerating}
                  loading={isGenerating}
                  appearance="outline"
                  kind="brand"
                  icon-start="download"
                >
                  Download
                </calcite-button>

                {job.status === "error" && job.error ? (
                  <p role="alert" className="options-table__error">
                    <calcite-icon icon="x-circle-f" scale="s" aria-hidden="true" />
                    {job.error}
                  </p>
                ) : null}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}