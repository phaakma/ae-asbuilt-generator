import React, { useState } from "react";
import type { DiagramEngine } from "@/domain/diagram";
import { diagramEngines } from "@/config/diagram-options";

type Props = {
  onSelect?: (engineId: string, themeId: string) => void;
  engines?: DiagramEngine[];
};

export function DiagramOptions({ onSelect, engines = diagramEngines }: Props) {
  const initial: Record<string, string> = {};
  engines.forEach((e) => (initial[e.id] = e.themes[0].id));
  const [selected, setSelected] = useState<Record<string, string>>(initial);

  return (
    <div>
      <h3>Diagram Options</h3>
      <table>
        <thead>
          <tr>
            <th>Engine</th>
            <th>Theme</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {engines.map((engine) => (
            <tr key={engine.id}>
              <td>{engine.label}</td>
              <td>
                <select
                  value={selected[engine.id]}
                  onChange={(e) => setSelected({ ...selected, [engine.id]: e.target.value })}
                >
                  {engine.themes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </td>
              <td>
                <button
                  onClick={() => {
                    onSelect?.(engine.id, selected[engine.id]);
                  }}
                >
                  Queue
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default DiagramOptions;
