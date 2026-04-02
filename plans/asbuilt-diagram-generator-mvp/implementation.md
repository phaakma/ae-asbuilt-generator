# ArcGIS Enterprise AsBuilt Diagram Generator (MVP)

## Goal
Build a static React + TypeScript web app that uploads ArcGIS Enterprise 11.5+ system-report JSON and generates downloadable Structurizr and Mermaid artifacts, with optional render in a new tab.

## Prerequisites
Make sure that the user is currently on the `feature/asbuilt-diagram-generator-mvp` branch before beginning implementation.
If not, move to the correct branch. If the branch does not exist, create it from `main`.

Use:

```powershell
git checkout main
git pull
git checkout -b feature/asbuilt-diagram-generator-mvp
```

Install toolchain (examples using nvm):

If you manage Node with nvm (macOS/Linux) or nvm-windows, prefer installing the required Node version via nvm so the project uses a compatible runtime.

Windows (nvm-windows) example in PowerShell:

```powershell
# list available versions (optional)
nvm list available
# install a recent 18.x release (replace with an available patch if needed)
nvm install 24.14.0
nvm use 24.14.0
node --version
npm --version
```

macOS / Linux (nvm) example:

```bash
# install and use latest 24.x
nvm install 24
nvm use 24
node --version
npm --version
```

If you don't use nvm, run:

```powershell
node --version
npm --version
```

Target versions:
- Node `>=18`
- npm `>=9`

### Step-by-Step Instructions

#### Step 1: Project bootstrap and extensible architecture shell
- [x] Initialize project files and plugin architecture contracts.
- [x] Copy and paste code below into `package.json`:

```json
{
  "name": "arcgis-asbuilt-diagram-tool",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest",
    "test:run": "vitest run",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "@arcgis/calcite-components": "^2.13.2",
    "date-fns": "^4.1.0",
    "file-saver": "^2.0.5",
    "jszip": "^3.10.1",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "zod": "^3.24.2"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.6.3",
    "@testing-library/react": "^16.3.0",
    "@testing-library/user-event": "^14.6.1",
    "@types/file-saver": "^2.0.7",
    "@types/node": "^22.13.10",
    "@types/react": "^18.3.19",
    "@types/react-dom": "^18.3.6",
    "@vitejs/plugin-react": "^4.3.4",
    "typescript": "^5.8.2",
    "vite": "^6.2.0",
    "vitest": "^3.0.8"
  },
  "engines": {
    "node": ">=18",
    "npm": ">=9"
  }
}
```

- [x] Copy and paste code below into `vite.config.ts`:

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": "/src"
    }
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"]
  }
});
```

- [x] Copy and paste code below into `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "moduleResolution": "Bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src", "vite.config.ts"]
}
```

- [x] Create `src/domain/diagram.ts` and paste:

```ts
export type DiagramEngineId = "structurizr" | "mermaid";

export type DiagramTheme = {
  id: string;
  label: string;
};

export type DiagramArtifact = {
  engineId: DiagramEngineId;
  fileExtension: ".dsl" | ".mmd";
  mimeType: string;
  content: string;
};

export type DiagramEngine = {
  id: DiagramEngineId;
  shortId: "dsl" | "mmd";
  label: string;
  canRender: boolean;
  renderFormats: Array<"svg" | "png">;
  themes: DiagramTheme[];
  generate: (input: unknown, themeId: string) => DiagramArtifact;
};
```

- [x] Create `src/config/diagram-options.ts` and paste:

```ts
import type { DiagramEngine } from "@/domain/diagram";
import { generateMermaid } from "@/engines/mermaid/generator";
import { generateStructurizr } from "@/engines/structurizr/generator";

export const diagramEngines: DiagramEngine[] = [
  {
    id: "structurizr",
    shortId: "dsl",
    label: "Structurizr DSL",
    canRender: true,
    renderFormats: ["svg", "png"],
    themes: [
      { id: "default", label: "Default" },
      { id: "enterprise", label: "Enterprise" }
    ],
    generate: generateStructurizr
  },
  {
    id: "mermaid",
    shortId: "mmd",
    label: "Mermaid",
    canRender: true,
    renderFormats: ["svg", "png"],
    themes: [
      { id: "default", label: "Default" },
      { id: "neutral", label: "Neutral" }
    ],
    generate: generateMermaid
  }
];
```

- [x] Create `src/engines/registry.ts` and paste:

```ts
import type { DiagramEngine, DiagramEngineId } from "@/domain/diagram";

export class DiagramRegistry {
  private readonly byId = new Map<DiagramEngineId, DiagramEngine>();

  constructor(engines: DiagramEngine[]) {
    engines.forEach((engine) => {
      this.byId.set(engine.id, engine);
    });
  }

  get(engineId: DiagramEngineId): DiagramEngine {
    const engine = this.byId.get(engineId);
    if (!engine) {
      throw new Error(`Engine not found: ${engineId}`);
    }
    return engine;
  }

  all(): DiagramEngine[] {
    return Array.from(this.byId.values());
  }
}
```

- [x] Create `src/engines/structurizr/generator.ts` and paste:

```ts
import type { DiagramArtifact } from "@/domain/diagram";

export function generateStructurizr(_: unknown, themeId: string): DiagramArtifact {
  const content = [
    `workspace "ArcGIS Enterprise" "AsBuilt" {`,
    `  model {`,
    `    user = person "Administrator"`,
    `    portal = softwareSystem "Portal for ArcGIS"`,
    `    user -> portal "Administers"`,
    `  }`,
    `  views {`,
    `    systemContext portal {`,
    `      include *`,
    `      autolayout lr`,
    `    }`,
    `    theme default`,
    `  }`,
    `}`,
    `// theme=${themeId}`
  ].join("\n");

  return {
    engineId: "structurizr",
    fileExtension: ".dsl",
    mimeType: "text/plain",
    content
  };
}
```

- [x] Create `src/engines/mermaid/generator.ts` and paste:

```ts
import type { DiagramArtifact } from "@/domain/diagram";

export function generateMermaid(_: unknown, themeId: string): DiagramArtifact {
  const content = [
    `%%{init: {'theme': '${themeId === "neutral" ? "neutral" : "default"}'}}%%`,
    `flowchart LR`,
    `  admin[Administrator] --> portal[Portal for ArcGIS]`
  ].join("\n");

  return {
    engineId: "mermaid",
    fileExtension: ".mmd",
    mimeType: "text/plain",
    content
  };
}
```

- [x] Copy and paste code below into `src/main.tsx`:

```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { defineCustomElements } from "@arcgis/calcite-components/dist/loader";
import App from "./App";
import "@arcgis/calcite-components/dist/calcite/calcite.css";
import "./styles.css";

defineCustomElements(window);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

- [x] Copy and paste code below into `src/App.tsx`:

```tsx
import { diagramEngines } from "@/config/diagram-options";
import { DiagramRegistry } from "@/engines/registry";

const registry = new DiagramRegistry(diagramEngines);

export default function App() {
  return (
    <main className="app-shell">
      <h1>ArcGIS Enterprise AsBuilt Diagram Generator</h1>
      <p>MVP registry initialized with {registry.all().length} engines.</p>
      <ul>
        {registry.all().map((engine) => (
          <li key={engine.id}>
            {engine.label} ({engine.id})
          </li>
        ))}
      </ul>
    </main>
  );
}
```

- [x] Create `src/styles.css` and paste:

```css
:root {
  font-family: "Avenir Next", "Segoe UI", sans-serif;
}

body {
  margin: 0;
  background: linear-gradient(135deg, #f8fbff 0%, #ecf3ff 100%);
  color: #1f2a37;
}

.app-shell {
  max-width: 960px;
  margin: 32px auto;
  padding: 24px;
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 8px 28px rgba(15, 23, 42, 0.12);
}
```

- [x] Create `src/test/setup.ts` and paste:

```ts
import "@testing-library/jest-dom";
```

- [x] Create `src/test/registry.test.ts` and paste:

```ts
import { describe, expect, it } from "vitest";
import { diagramEngines } from "@/config/diagram-options";
import { DiagramRegistry } from "@/engines/registry";

describe("diagram registry", () => {
  it("loads both MVP engines", () => {
    const registry = new DiagramRegistry(diagramEngines);
    expect(registry.all().map((e) => e.id)).toEqual(["structurizr", "mermaid"]);
  });

  it("exposes capability metadata", () => {
    const registry = new DiagramRegistry(diagramEngines);
    expect(registry.get("mermaid").renderFormats).toContain("svg");
  });
});
```

- [x] Install and smoke test:

```powershell
npm install
npm run type-check
npm run test:run
npm run build
```

##### Step 1 Verification Checklist
- [x] `npm run type-check` passes.
- [x] `npm run test:run` passes `src/test/registry.test.ts`.
- [x] `npm run build` creates `dist/` without errors.

#### Step 1 STOP & COMMIT
**STOP & COMMIT:** Agent completed Step 1 file changes and must stop here for you to test, stage, and commit the change.

#### Step 2: Upload, parse, and normalize ArcGIS report JSON
- [x] Add upload feature and parser pipeline.
- [x] Create `src/domain/deployment-model.ts` and paste:

```ts
export type Machine = {
  name: string;
};

export type PortalNode = {
  organizationUrl: string;
  currentVersion: string;
  machines: Machine[];
};

export type ServerSite = {
  serverId: string;
  siteUrl: string;
  serverRole: string;
  machines: Machine[];
};

export type DataStore = {
  type: string;
  machines: Machine[];
};

export type WebAdaptor = {
  context: string;
  targetUrl: string;
  machines: Machine[];
};

export type NormalizedDeployment = {
  portal: PortalNode;
  serverSites: ServerSite[];
  dataStores: DataStore[];
  webAdaptors: WebAdaptor[];
};
```

- [x] Create `src/parsers/arcgis-report-parser.ts` and paste:

```ts
import { z } from "zod";

const machineSchema = z.object({
  machineName: z.string().optional(),
  name: z.string().optional()
});

const reportSchema = z.object({
  siteMap: z.object({
    portal: z.object({
      organizationUrl: z.string().default(""),
      currentVersion: z.string().default("unknown"),
      machines: z.array(machineSchema).default([])
    }),
    serverSites: z
      .array(
        z.object({
          serverId: z.string().default("unknown"),
          siteUrl: z.string().default(""),
          serverRole: z.string().default("UNKNOWN"),
          machines: z.array(machineSchema).default([])
        })
      )
      .default([]),
    dataStores: z
      .array(
        z.object({
          store: z.object({ type: z.string().default("unknown") }).optional(),
          machines: z.array(machineSchema).default([])
        })
      )
      .default([]),
    webAdaptors: z
      .array(
        z.object({
          context: z.string().default(""),
          targetUrl: z.string().default(""),
          machines: z.array(machineSchema).default([])
        })
      )
      .default([])
  })
});

export type ParsedArcGisReport = z.infer<typeof reportSchema>;

export function parseArcGisReport(input: unknown): ParsedArcGisReport {
  return reportSchema.parse(input);
}
```

- [x] Create `src/parsers/normalize.ts` and paste:

```ts
import type { NormalizedDeployment } from "@/domain/deployment-model";
import type { ParsedArcGisReport } from "@/parsers/arcgis-report-parser";

function normalizeMachineName(item: { machineName?: string; name?: string }): string {
  return item.machineName ?? item.name ?? "unknown-machine";
}

export function normalizeReport(input: ParsedArcGisReport): NormalizedDeployment {
  const portal = {
    organizationUrl: input.siteMap.portal.organizationUrl,
    currentVersion: input.siteMap.portal.currentVersion,
    machines: input.siteMap.portal.machines.map((m) => ({ name: normalizeMachineName(m) }))
  };

  const serverSites = input.siteMap.serverSites.map((site) => ({
    serverId: site.serverId,
    siteUrl: site.siteUrl,
    serverRole: site.serverRole,
    machines: site.machines.map((m) => ({ name: normalizeMachineName(m) }))
  }));

  const dataStores = input.siteMap.dataStores.map((ds) => ({
    type: ds.store?.type ?? "unknown",
    machines: ds.machines.map((m) => ({ name: normalizeMachineName(m) }))
  }));

  const webAdaptors = input.siteMap.webAdaptors.map((wa) => ({
    context: wa.context,
    targetUrl: wa.targetUrl,
    machines: wa.machines.map((m) => ({ name: normalizeMachineName(m) }))
  }));

  return {
    portal,
    serverSites,
    dataStores,
    webAdaptors
  };
}
```

- [x] Create `src/features/upload/FileUpload.tsx` and paste:

```tsx
import { useState } from "react";
import { parseArcGisReport } from "@/parsers/arcgis-report-parser";
import { normalizeReport } from "@/parsers/normalize";
import type { NormalizedDeployment } from "@/domain/deployment-model";

type Props = {
  onLoaded: (deployment: NormalizedDeployment, fileName: string) => void;
};

export default function FileUpload({ onLoaded }: Props) {
  const [error, setError] = useState<string>("");

  const onChange: React.ChangeEventHandler<HTMLInputElement> = async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const raw = await file.text();
      const parsed = parseArcGisReport(JSON.parse(raw));
      const normalized = normalizeReport(parsed);
      onLoaded(normalized, file.name);
      setError("");
    } catch {
      setError("Invalid ArcGIS report JSON.");
    }
  };

  return (
    <section>
      <label htmlFor="report">Upload system report JSON</label>
      <input id="report" type="file" accept="application/json" onChange={onChange} />
      {error ? <p role="alert">{error}</p> : null}
    </section>
  );
}
```

- [x] Replace `src/App.tsx` with:

```tsx
import { useMemo, useState } from "react";
import { format } from "date-fns";
import { diagramEngines } from "@/config/diagram-options";
import type { NormalizedDeployment } from "@/domain/deployment-model";
import { DiagramRegistry } from "@/engines/registry";
import FileUpload from "@/features/upload/FileUpload";

const registry = new DiagramRegistry(diagramEngines);

export default function App() {
  const [deployment, setDeployment] = useState<NormalizedDeployment | null>(null);
  const [fileName, setFileName] = useState("");

  const dateText = useMemo(() => format(new Date(), "yyyy-MM-dd"), []);

  return (
    <main className="app-shell">
      <h1>ArcGIS Enterprise AsBuilt Diagram Generator</h1>
      <FileUpload
        onLoaded={(nextDeployment, nextFileName) => {
          setDeployment(nextDeployment);
          setFileName(nextFileName);
        }}
      />
      <p>Local date: {dateText}</p>
      <p>Uploaded file: {fileName || "none"}</p>
      <p>Registered engines: {registry.all().length}</p>
      <pre>{deployment ? JSON.stringify(deployment, null, 2) : "No deployment loaded"}</pre>
    </main>
  );
}
```

- [x] Create `src/test/parser.test.ts` and paste:

```ts
import { describe, expect, it } from "vitest";
import sample1 from "../../sample1.json";
import sample2 from "../../sample2.json";
import { parseArcGisReport } from "@/parsers/arcgis-report-parser";
import { normalizeReport } from "@/parsers/normalize";

describe("arcgis parser", () => {
  it("parses sample1", () => {
    const parsed = parseArcGisReport(sample1);
    const normalized = normalizeReport(parsed);
    expect(normalized.portal.currentVersion.length).toBeGreaterThan(0);
  });

  it("parses sample2", () => {
    const parsed = parseArcGisReport(sample2);
    const normalized = normalizeReport(parsed);
    expect(normalized.serverSites.length).toBeGreaterThan(0);
  });

  it("throws on invalid payload", () => {
    expect(() => parseArcGisReport({ nope: true })).toThrowError();
  });
});
```

##### Step 2 Verification Checklist
- [x] Uploading `sample1.json` and `sample2.json` shows parsed summary.
- [x] Invalid JSON shows `Invalid ArcGIS report JSON.`
- [x] `npm run test:run` passes parser tests.

#### Step 2 STOP & COMMIT
**STOP & COMMIT:** Agent completed Step 2 file changes and must stop here for you to test, stage, and commit the change.

#### Step 3: Metadata form and validation rules
- [x] Implement metadata form and validators.
- [x] Create `src/utils/validation.ts` and paste:

```ts
const deploymentNameRegex = /^[A-Za-z0-9\- ]+$/;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateDeploymentName(value: string): string | null {
  if (!value.trim()) {
    return "Deployment Name is required.";
  }
  if (value.length > 100) {
    return "Deployment Name must be 100 characters or fewer.";
  }
  if (!deploymentNameRegex.test(value)) {
    return "Deployment Name may only contain letters, numbers, spaces, and hyphens.";
  }
  return null;
}

export function validateEmail(value: string): string | null {
  if (!value) {
    return null;
  }
  if (!emailRegex.test(value)) {
    return "Email format is invalid.";
  }
  return null;
}
```

- [x] Create `src/utils/slug.ts` and paste:

```ts
export function toDeploymentSlug(value: string, maxLength = 20): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\- ]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, maxLength);
}
```

- [x] Create `src/features/metadata/MetadataForm.tsx` and paste:

```tsx
import { useMemo, useState } from "react";
import { validateDeploymentName, validateEmail } from "@/utils/validation";

export type Metadata = {
  deploymentName: string;
  description: string;
  userName: string;
  email: string;
  phone: string;
};

type Props = {
  value: Metadata;
  onChange: (value: Metadata, valid: boolean) => void;
};

export default function MetadataForm({ value, onChange }: Props) {
  const [touched, setTouched] = useState(false);

  const deploymentNameError = useMemo(() => validateDeploymentName(value.deploymentName), [value.deploymentName]);
  const emailError = useMemo(() => validateEmail(value.email), [value.email]);
  const valid = !deploymentNameError && !emailError;

  function update<K extends keyof Metadata>(key: K, nextValue: string) {
    const next = { ...value, [key]: nextValue };
    onChange(next, !validateDeploymentName(next.deploymentName) && !validateEmail(next.email));
  }

  return (
    <section>
      <h2>Metadata</h2>
      <label htmlFor="deploymentName">Deployment Name</label>
      <input
        id="deploymentName"
        value={value.deploymentName}
        maxLength={100}
        onBlur={() => setTouched(true)}
        onChange={(e) => update("deploymentName", e.target.value)}
      />
      {touched && deploymentNameError ? <p role="alert">{deploymentNameError}</p> : null}

      <label htmlFor="description">Description</label>
      <textarea id="description" value={value.description} onChange={(e) => update("description", e.target.value)} />

      <label htmlFor="userName">User Name</label>
      <input id="userName" value={value.userName} onChange={(e) => update("userName", e.target.value)} />

      <label htmlFor="email">Email</label>
      <input id="email" value={value.email} onChange={(e) => update("email", e.target.value)} />
      {touched && emailError ? <p role="alert">{emailError}</p> : null}

      <label htmlFor="phone">Phone</label>
      <input id="phone" value={value.phone} onChange={(e) => update("phone", e.target.value)} />

      <p>Form valid: {valid ? "yes" : "no"}</p>
    </section>
  );
}
```

- [x] Replace `src/App.tsx` with:

```tsx
import { useMemo, useState } from "react";
import { format } from "date-fns";
import type { NormalizedDeployment } from "@/domain/deployment-model";
import FileUpload from "@/features/upload/FileUpload";
import MetadataForm, { type Metadata } from "@/features/metadata/MetadataForm";

const initialMetadata: Metadata = {
  deploymentName: "",
  description: "",
  userName: "",
  email: "",
  phone: ""
};

export default function App() {
  const [deployment, setDeployment] = useState<NormalizedDeployment | null>(null);
  const [fileName, setFileName] = useState("");
  const [metadata, setMetadata] = useState<Metadata>(initialMetadata);
  const [metadataValid, setMetadataValid] = useState(false);

  const dateText = useMemo(() => format(new Date(), "yyyy-MM-dd"), []);

  return (
    <main className="app-shell">
      <h1>ArcGIS Enterprise AsBuilt Diagram Generator</h1>
      <FileUpload
        onLoaded={(nextDeployment, nextFileName) => {
          setDeployment(nextDeployment);
          setFileName(nextFileName);
        }}
      />
      <MetadataForm
        value={metadata}
        onChange={(next, valid) => {
          setMetadata(next);
          setMetadataValid(valid);
        }}
      />
      <p>Local date: {dateText}</p>
      <p>Uploaded file: {fileName || "none"}</p>
      <p>Metadata valid: {metadataValid ? "yes" : "no"}</p>
      <pre>{deployment ? JSON.stringify(deployment, null, 2) : "No deployment loaded"}</pre>
    </main>
  );
}
```

- [x] Create `src/test/validation.test.ts` and paste:

```ts
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
```

##### Step 3 Verification Checklist
- [x] Deployment Name is required and capped at 100 chars.
- [x] Deployment Name accepts letters, numbers, spaces, and hyphens.
- [x] Email is optional and only validated when present.
- [x] `npm run test:run` passes validation tests.

#### Step 3 STOP & COMMIT
**STOP & COMMIT:** Agent completed Step 3 file changes and must stop here for you to test, stage, and commit the change.

#### Step 4: Diagram generation engines (Structurizr + Mermaid)
- [x] Switch generators to use normalized deployment model and deterministic output.
- [ ] Replace `src/engines/structurizr/generator.ts` with:

```ts
import type { DiagramArtifact } from "@/domain/diagram";
import type { NormalizedDeployment } from "@/domain/deployment-model";

export function generateStructurizr(input: unknown, themeId: string): DiagramArtifact {
  const model = input as NormalizedDeployment;

  const lines: string[] = [];
  lines.push(`workspace "ArcGIS Enterprise" "AsBuilt" {`);
  lines.push(`  model {`);
  lines.push(`    admin = person "Administrator"`);
  lines.push(`    portal = softwareSystem "Portal for ArcGIS"`);
  model.serverSites.forEach((site, index) => {
    lines.push(`    server${index} = softwareSystem "${site.serverId}"`);
  });
  model.dataStores.forEach((store, index) => {
    lines.push(`    store${index} = softwareSystem "Data Store ${store.type}"`);
  });
  lines.push(`    admin -> portal "Manages"`);
  model.serverSites.forEach((_, index) => {
    lines.push(`    portal -> server${index} "Federates"`);
  });
  model.dataStores.forEach((_, index) => {
    lines.push(`    portal -> store${index} "Uses"`);
  });
  lines.push(`  }`);
  lines.push(`  views {`);
  lines.push(`    systemContext portal {`);
  lines.push(`      include *`);
  lines.push(`      autolayout lr`);
  lines.push(`    }`);
  lines.push(`    theme default`);
  lines.push(`  }`);
  lines.push(`}`);
  lines.push(`// theme=${themeId}`);

  return {
    engineId: "structurizr",
    fileExtension: ".dsl",
    mimeType: "text/plain",
    content: lines.join("\n")
  };
}
```

- [ ] Replace `src/engines/mermaid/generator.ts` with:

```ts
import type { DiagramArtifact } from "@/domain/diagram";
import type { NormalizedDeployment } from "@/domain/deployment-model";

export function generateMermaid(input: unknown, themeId: string): DiagramArtifact {
  const model = input as NormalizedDeployment;
  const lines: string[] = [];
  lines.push(`%%{init: {'theme': '${themeId === "neutral" ? "neutral" : "default"}'}}%%`);
  lines.push(`flowchart LR`);
  lines.push(`  portal[Portal for ArcGIS]`);
  model.serverSites.forEach((site, index) => {
    lines.push(`  server${index}[${site.serverId}]`);
    lines.push(`  portal --> server${index}`);
  });
  model.dataStores.forEach((store, index) => {
    lines.push(`  ds${index}[Data Store: ${store.type}]`);
    lines.push(`  portal --> ds${index}`);
  });

  return {
    engineId: "mermaid",
    fileExtension: ".mmd",
    mimeType: "text/plain",
    content: lines.join("\n")
  };
}
```

- [ ] Create `src/features/generate/generate-service.ts` and paste:

```ts
import { diagramEngines } from "@/config/diagram-options";
import type { DiagramArtifact, DiagramEngineId } from "@/domain/diagram";
import type { NormalizedDeployment } from "@/domain/deployment-model";
import { DiagramRegistry } from "@/engines/registry";

const registry = new DiagramRegistry(diagramEngines);

export function generateArtifact(
  engineId: DiagramEngineId,
  deployment: NormalizedDeployment,
  themeId: string
): DiagramArtifact {
  const engine = registry.get(engineId);
  return engine.generate(deployment, themeId);
}
```

- [ ] Create `src/test/generator.test.ts` and paste:

```ts
import { describe, expect, it } from "vitest";
import sample1 from "../../sample1.json";
import sample2 from "../../sample2.json";
import { parseArcGisReport } from "@/parsers/arcgis-report-parser";
import { normalizeReport } from "@/parsers/normalize";
import { generateArtifact } from "@/features/generate/generate-service";

describe("artifact generation", () => {
  it("generates structurizr and mermaid for sample1", () => {
    const deployment = normalizeReport(parseArcGisReport(sample1));
    const dsl = generateArtifact("structurizr", deployment, "default");
    const mmd = generateArtifact("mermaid", deployment, "default");
    expect(dsl.fileExtension).toBe(".dsl");
    expect(mmd.fileExtension).toBe(".mmd");
  });

  it("is deterministic for same input", () => {
    const deployment = normalizeReport(parseArcGisReport(sample2));
    const first = generateArtifact("mermaid", deployment, "neutral").content;
    const second = generateArtifact("mermaid", deployment, "neutral").content;
    expect(first).toBe(second);
  });
});
```

##### Step 4 Verification Checklist
- [x] Generated `.dsl` and `.mmd` are produced for both samples.
- [x] Same input + same theme yields byte-identical output.
- [x] `npm run test:run` passes generator tests.

#### Step 4 STOP & COMMIT
**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

#### Step 5: Diagram options table and job state workflow
- [ ] Add per-engine job state and options table.
- [ ] Create `src/features/jobs/job-state.ts` and paste:

```ts
import type { DiagramArtifact, DiagramEngineId } from "@/domain/diagram";

export type JobStatus = "idle" | "generating" | "success" | "error";

export type EngineJob = {
  engineId: DiagramEngineId;
  status: JobStatus;
  artifact: DiagramArtifact | null;
  error: string;
  themeId: string;
  renderFormat: "svg" | "png";
};

export function initialJob(engineId: DiagramEngineId, themeId: string): EngineJob {
  return {
    engineId,
    status: "idle",
    artifact: null,
    error: "",
    themeId,
    renderFormat: "svg"
  };
}
```

- [ ] Create `src/features/options/DiagramOptionsTable.tsx` and paste:

```tsx
import type { DiagramEngine } from "@/domain/diagram";
import type { EngineJob } from "@/features/jobs/job-state";

type Props = {
  engines: DiagramEngine[];
  jobs: Record<string, EngineJob>;
  onThemeChange: (engineId: string, themeId: string) => void;
  onRenderFormatChange: (engineId: string, renderFormat: "svg" | "png") => void;
  onGenerate: (engineId: string) => void;
  onDownload: (engineId: string) => void;
  onRender: (engineId: string) => void;
};

export default function DiagramOptionsTable({
  engines,
  jobs,
  onThemeChange,
  onRenderFormatChange,
  onGenerate,
  onDownload,
  onRender
}: Props) {
  return (
    <table>
      <thead>
        <tr>
          <th>Engine</th>
          <th>Theme</th>
          <th>Render Format</th>
          <th>Actions</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {engines.map((engine) => {
          const job = jobs[engine.id];
          const isGenerating = job.status === "generating";
          const canDownload = job.status === "success";
          const canRender = job.status === "success" && engine.canRender;

          return (
            <tr key={engine.id}>
              <td>{engine.label}</td>
              <td>
                <select
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
              <td>
                <select
                  value={job.renderFormat}
                  onChange={(e) => onRenderFormatChange(engine.id, e.target.value as "svg" | "png")}
                  disabled={isGenerating || !engine.canRender}
                >
                  {engine.renderFormats.map((format) => (
                    <option key={format} value={format}>
                      {format}
                    </option>
                  ))}
                </select>
              </td>
              <td>
                <button onClick={() => onGenerate(engine.id)} disabled={isGenerating}>
                  {isGenerating ? "Generating..." : "Generate"}
                </button>
                <button onClick={() => onDownload(engine.id)} disabled={!canDownload || isGenerating}>
                  Download
                </button>
                <button onClick={() => onRender(engine.id)} disabled={!canRender || isGenerating}>
                  {engine.canRender ? "Render" : "UNAVAILABLE"}
                </button>
              </td>
              <td>{job.status}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
```

- [ ] Replace `src/App.tsx` with:

```tsx
import { useMemo, useState } from "react";
import { format } from "date-fns";
import { diagramEngines } from "@/config/diagram-options";
import type { DiagramEngineId } from "@/domain/diagram";
import type { NormalizedDeployment } from "@/domain/deployment-model";
import FileUpload from "@/features/upload/FileUpload";
import MetadataForm, { type Metadata } from "@/features/metadata/MetadataForm";
import DiagramOptionsTable from "@/features/options/DiagramOptionsTable";
import { initialJob, type EngineJob } from "@/features/jobs/job-state";
import { generateArtifact } from "@/features/generate/generate-service";

const initialMetadata: Metadata = {
  deploymentName: "",
  description: "",
  userName: "",
  email: "",
  phone: ""
};

export default function App() {
  const [deployment, setDeployment] = useState<NormalizedDeployment | null>(null);
  const [fileName, setFileName] = useState("");
  const [metadata, setMetadata] = useState<Metadata>(initialMetadata);
  const [metadataValid, setMetadataValid] = useState(false);

  const [jobs, setJobs] = useState<Record<string, EngineJob>>(() =>
    Object.fromEntries(diagramEngines.map((engine) => [engine.id, initialJob(engine.id, engine.themes[0].id)]))
  );

  const dateText = useMemo(() => format(new Date(), "yyyy-MM-dd"), []);

  const onGenerate = (engineId: string) => {
    if (!deployment) {
      return;
    }

    setJobs((prev) => ({
      ...prev,
      [engineId]: { ...prev[engineId], status: "generating", error: "" }
    }));

    setTimeout(() => {
      try {
        setJobs((prev) => ({
          ...prev,
          [engineId]: {
            ...prev[engineId],
            status: "success",
            artifact: generateArtifact(engineId as DiagramEngineId, deployment, prev[engineId].themeId)
          }
        }));
      } catch {
        setJobs((prev) => ({
          ...prev,
          [engineId]: { ...prev[engineId], status: "error", error: "Generation failed" }
        }));
      }
    }, 200);
  };

  return (
    <main className="app-shell">
      <h1>ArcGIS Enterprise AsBuilt Diagram Generator</h1>
      <FileUpload
        onLoaded={(nextDeployment, nextFileName) => {
          setDeployment(nextDeployment);
          setFileName(nextFileName);
        }}
      />
      <MetadataForm
        value={metadata}
        onChange={(next, valid) => {
          setMetadata(next);
          setMetadataValid(valid);
        }}
      />
      <p>Local date: {dateText}</p>
      <p>Uploaded file: {fileName || "none"}</p>
      <p>Metadata valid: {metadataValid ? "yes" : "no"}</p>

      <DiagramOptionsTable
        engines={diagramEngines}
        jobs={jobs}
        onThemeChange={(engineId, themeId) => {
          setJobs((prev) => ({ ...prev, [engineId]: { ...prev[engineId], themeId } }));
        }}
        onRenderFormatChange={(engineId, renderFormat) => {
          setJobs((prev) => ({ ...prev, [engineId]: { ...prev[engineId], renderFormat } }));
        }}
        onGenerate={onGenerate}
        onDownload={() => undefined}
        onRender={() => undefined}
      />

      <pre>{deployment ? JSON.stringify(deployment, null, 2) : "No deployment loaded"}</pre>
    </main>
  );
}
```

##### Step 5 Verification Checklist
- [ ] Initial state: `Download` disabled and `Render` disabled.
- [ ] During generation: spinner text `Generating...` is shown and controls are locked.
- [ ] After success: `Download` and `Render` become enabled for render-capable engines.

#### Step 5 STOP & COMMIT
**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

#### Step 6: ZIP packaging and README generation
- [x] Add ZIP packaging and deterministic filename utilities.
- [x] Create `src/utils/file-naming.ts` and paste:

```ts
import { format } from "date-fns";
import { toDeploymentSlug } from "@/utils/slug";

export function buildZipFilename(deploymentName: string, engineShortId: string, at = new Date()): string {
  const deploymentSlug20 = toDeploymentSlug(deploymentName, 20);
  const localYYYYMMDDHHmm = format(at, "yyyyMMddHHmm");
  return `${deploymentSlug20}__${engineShortId}_${localYYYYMMDDHHmm}.zip`;
}
```

- [x] Create `src/features/download/readme-builder.ts` and paste:

```ts
import type { Metadata } from "@/features/metadata/MetadataForm";

const DISCLAIMER = [
  "This tool generates architecture diagrams from user-supplied ArcGIS Enterprise system report JSON and optional metadata.",
  "Outputs are best-effort interpretations and may omit, simplify, or misrepresent environment details.",
  "You are responsible for validating all generated artifacts before operational, security, compliance, procurement, or architectural decisions.",
  "Use at your own risk. The authors and contributors provide this software and generated outputs \"as is\", without warranties of any kind, express or implied, including accuracy, fitness for a particular purpose, and non-infringement.",
  "Do not include sensitive or regulated information in metadata unless your organization permits it."
].join("\n");

export function buildReadme(metadata: Metadata, engineLabel: string, generatedAt: Date): string {
  return [
    `# ${metadata.deploymentName} - ${engineLabel}`,
    "",
    `Generated: ${generatedAt.toString()}`,
    "",
    "## Metadata",
    `- Deployment Name: ${metadata.deploymentName}`,
    `- Description: ${metadata.description || "(none)"}`,
    `- User Name: ${metadata.userName || "(none)"}`,
    `- Email: ${metadata.email || "(none)"}`,
    `- Phone: ${metadata.phone || "(none)"}`,
    "",
    "## Disclaimer",
    DISCLAIMER,
    ""
  ].join("\n");
}
```

- [x] Create `src/features/download/zip-builder.ts` and paste:

```ts
import JSZip from "jszip";
import { saveAs } from "file-saver";
import type { DiagramArtifact } from "@/domain/diagram";
import { buildZipFilename } from "@/utils/file-naming";

export async function downloadZip(args: {
  deploymentName: string;
  engineShortId: string;
  readme: string;
  artifact: DiagramArtifact;
  generatedAt: Date;
}): Promise<void> {
  const zip = new JSZip();
  zip.file("README.md", args.readme);
  zip.file(`diagram${args.artifact.fileExtension}`, args.artifact.content);

  const blob = await zip.generateAsync({ type: "blob" });
  const fileName = buildZipFilename(args.deploymentName, args.engineShortId, args.generatedAt);
  saveAs(blob, fileName);
}
```

- [x] Replace `src/App.tsx` with:

```tsx
import { useMemo, useState } from "react";
import { format } from "date-fns";
import { diagramEngines } from "@/config/diagram-options";
import type { DiagramEngineId } from "@/domain/diagram";
import type { NormalizedDeployment } from "@/domain/deployment-model";
import FileUpload from "@/features/upload/FileUpload";
import MetadataForm, { type Metadata } from "@/features/metadata/MetadataForm";
import DiagramOptionsTable from "@/features/options/DiagramOptionsTable";
import { initialJob, type EngineJob } from "@/features/jobs/job-state";
import { generateArtifact } from "@/features/generate/generate-service";
import { buildReadme } from "@/features/download/readme-builder";
import { downloadZip } from "@/features/download/zip-builder";

const initialMetadata: Metadata = {
  deploymentName: "",
  description: "",
  userName: "",
  email: "",
  phone: ""
};

export default function App() {
  const [deployment, setDeployment] = useState<NormalizedDeployment | null>(null);
  const [fileName, setFileName] = useState("");
  const [metadata, setMetadata] = useState<Metadata>(initialMetadata);
  const [metadataValid, setMetadataValid] = useState(false);

  const [jobs, setJobs] = useState<Record<string, EngineJob>>(() =>
    Object.fromEntries(diagramEngines.map((engine) => [engine.id, initialJob(engine.id, engine.themes[0].id)]))
  );

  const dateText = useMemo(() => format(new Date(), "yyyy-MM-dd"), []);

  const onGenerate = (engineId: string) => {
    if (!deployment || !metadataValid) {
      return;
    }

    setJobs((prev) => ({
      ...prev,
      [engineId]: { ...prev[engineId], status: "generating", error: "" }
    }));

    setTimeout(() => {
      try {
        setJobs((prev) => ({
          ...prev,
          [engineId]: {
            ...prev[engineId],
            status: "success",
            artifact: generateArtifact(engineId as DiagramEngineId, deployment, prev[engineId].themeId)
          }
        }));
      } catch {
        setJobs((prev) => ({
          ...prev,
          [engineId]: { ...prev[engineId], status: "error", error: "Generation failed" }
        }));
      }
    }, 200);
  };

  const onDownload = async (engineId: string) => {
    const job = jobs[engineId];
    const engine = diagramEngines.find((item) => item.id === engineId);
    if (!job?.artifact || !engine) {
      return;
    }

    await downloadZip({
      deploymentName: metadata.deploymentName,
      engineShortId: engine.shortId,
      readme: buildReadme(metadata, engine.label, new Date()),
      artifact: job.artifact,
      generatedAt: new Date()
    });
  };

  return (
    <main className="app-shell">
      <h1>ArcGIS Enterprise AsBuilt Diagram Generator</h1>
      <FileUpload
        onLoaded={(nextDeployment, nextFileName) => {
          setDeployment(nextDeployment);
          setFileName(nextFileName);
        }}
      />
      <MetadataForm
        value={metadata}
        onChange={(next, valid) => {
          setMetadata(next);
          setMetadataValid(valid);
        }}
      />
      <p>Local date: {dateText}</p>
      <p>Uploaded file: {fileName || "none"}</p>
      <p>Metadata valid: {metadataValid ? "yes" : "no"}</p>

      <DiagramOptionsTable
        engines={diagramEngines}
        jobs={jobs}
        onThemeChange={(engineId, themeId) => {
          setJobs((prev) => ({ ...prev, [engineId]: { ...prev[engineId], themeId } }));
        }}
        onRenderFormatChange={(engineId, renderFormat) => {
          setJobs((prev) => ({ ...prev, [engineId]: { ...prev[engineId], renderFormat } }));
        }}
        onGenerate={onGenerate}
        onDownload={onDownload}
        onRender={() => undefined}
      />

      <pre>{deployment ? JSON.stringify(deployment, null, 2) : "No deployment loaded"}</pre>
    </main>
  );
}
```

- [x] Create `src/test/download.test.ts` and paste:

```ts
import { describe, expect, it } from "vitest";
import { buildZipFilename } from "@/utils/file-naming";

describe("file naming", () => {
  it("uses slug20 and local timestamp", () => {
    const at = new Date(2026, 2, 6, 14, 5);
    const file = buildZipFilename("My Deployment Name Is Very Long", "dsl", at);
    expect(file).toBe("my-deployment-name-is__dsl_202603061405.zip");
  });
});
```

##### Step 6 Verification Checklist
- [x] ZIP contains `README.md` and generated diagram file.
- [x] ZIP filename matches `{deploymentSlug20}__{engineShortId}_{localYYYYMMDDHHmm}.zip`.
- [x] README contains metadata, timestamp, and disclaimer text.

#### Step 6 STOP & COMMIT
**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

#### Step 7: Rendering integration (examples in MVP)
- [x] Add render service with runtime-configured Kroki endpoint and new-tab behavior.
- [x] Create `public/config.json` and paste:

```json
{
  "krokiEndpoint": "https://kroki.io",
  "diagramOptions": {
    "structurizr": {
      "active": true
    },
    "mermaid": {
      "active": true
    }
  }
}
```

- [x] Create `src/config/runtime-config.ts` and paste:

```ts
export type RuntimeConfig = {
  krokiEndpoint: string;
  diagramOptions: Record<string, { active: boolean }>;
};

const fallback: RuntimeConfig = {
  krokiEndpoint: "https://kroki.io",
  diagramOptions: {
    structurizr: { active: true },
    mermaid: { active: true }
  }
};

export async function loadRuntimeConfig(): Promise<RuntimeConfig> {
  try {
    const response = await fetch("/config.json");
    if (!response.ok) {
      return fallback;
    }
    return (await response.json()) as RuntimeConfig;
  } catch {
    return fallback;
  }
}
```

- [x] Create `src/features/render/render-service.ts` and paste:

```ts
import type { DiagramArtifact } from "@/domain/diagram";

function toBase64(value: string): string {
  return btoa(unescape(encodeURIComponent(value)));
}

function toKrokiType(engineId: string): string {
  if (engineId === "mermaid") {
    return "mermaid";
  }
  return "structurizr";
}

export function buildRenderUrl(
  artifact: DiagramArtifact,
  format: "svg" | "png",
  krokiEndpoint: string
): string {
  const type = toKrokiType(artifact.engineId);
  const encoded = toBase64(artifact.content);
  return `${krokiEndpoint}/${type}/${format}/${encoded}`;
}

export function openRenderTab(url: string): void {
  window.open(url, "_blank", "noopener,noreferrer");
}
```

- [x] Replace `src/App.tsx` with:

```tsx
import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { diagramEngines } from "@/config/diagram-options";
import { loadRuntimeConfig, type RuntimeConfig } from "@/config/runtime-config";
import type { DiagramEngineId } from "@/domain/diagram";
import type { NormalizedDeployment } from "@/domain/deployment-model";
import FileUpload from "@/features/upload/FileUpload";
import MetadataForm, { type Metadata } from "@/features/metadata/MetadataForm";
import DiagramOptionsTable from "@/features/options/DiagramOptionsTable";
import { initialJob, type EngineJob } from "@/features/jobs/job-state";
import { generateArtifact } from "@/features/generate/generate-service";
import { buildReadme } from "@/features/download/readme-builder";
import { downloadZip } from "@/features/download/zip-builder";
import { buildRenderUrl, openRenderTab } from "@/features/render/render-service";

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
  const [runtimeConfig, setRuntimeConfig] = useState<RuntimeConfig>(defaultRuntimeConfig);
  const [deployment, setDeployment] = useState<NormalizedDeployment | null>(null);
  const [fileName, setFileName] = useState("");
  const [metadata, setMetadata] = useState<Metadata>(initialMetadata);
  const [metadataValid, setMetadataValid] = useState(false);

  const [jobs, setJobs] = useState<Record<string, EngineJob>>(() =>
    Object.fromEntries(diagramEngines.map((engine) => [engine.id, initialJob(engine.id, engine.themes[0].id)]))
  );

  useEffect(() => {
    loadRuntimeConfig().then(setRuntimeConfig);
  }, []);

  const dateText = useMemo(() => format(new Date(), "yyyy-MM-dd"), []);

  const onGenerate = (engineId: string) => {
    if (!deployment || !metadataValid) {
      return;
    }

    setJobs((prev) => ({
      ...prev,
      [engineId]: { ...prev[engineId], status: "generating", error: "" }
    }));

    setTimeout(() => {
      try {
        setJobs((prev) => ({
          ...prev,
          [engineId]: {
            ...prev[engineId],
            status: "success",
            artifact: generateArtifact(engineId as DiagramEngineId, deployment, prev[engineId].themeId)
          }
        }));
      } catch {
        setJobs((prev) => ({
          ...prev,
          [engineId]: { ...prev[engineId], status: "error", error: "Generation failed" }
        }));
      }
    }, 200);
  };

  const onDownload = async (engineId: string) => {
    const job = jobs[engineId];
    const engine = diagramEngines.find((item) => item.id === engineId);
    if (!job?.artifact || !engine) {
      return;
    }

    await downloadZip({
      deploymentName: metadata.deploymentName,
      engineShortId: engine.shortId,
      readme: buildReadme(metadata, engine.label, new Date()),
      artifact: job.artifact,
      generatedAt: new Date()
    });
  };

  const onRender = (engineId: string) => {
    const job = jobs[engineId];
    if (!job?.artifact) {
      return;
    }
    const url = buildRenderUrl(job.artifact, job.renderFormat, runtimeConfig.krokiEndpoint);
    openRenderTab(url);
  };

  const activeEngines = diagramEngines.filter((engine) => runtimeConfig.diagramOptions[engine.id]?.active !== false);

  return (
    <main className="app-shell">
      <h1>ArcGIS Enterprise AsBuilt Diagram Generator</h1>
      <FileUpload
        onLoaded={(nextDeployment, nextFileName) => {
          setDeployment(nextDeployment);
          setFileName(nextFileName);
        }}
      />
      <MetadataForm
        value={metadata}
        onChange={(next, valid) => {
          setMetadata(next);
          setMetadataValid(valid);
        }}
      />
      <p>Local date: {dateText}</p>
      <p>Uploaded file: {fileName || "none"}</p>
      <p>Metadata valid: {metadataValid ? "yes" : "no"}</p>

      <DiagramOptionsTable
        engines={activeEngines}
        jobs={jobs}
        onThemeChange={(engineId, themeId) => {
          setJobs((prev) => ({ ...prev, [engineId]: { ...prev[engineId], themeId } }));
        }}
        onRenderFormatChange={(engineId, renderFormat) => {
          setJobs((prev) => ({ ...prev, [engineId]: { ...prev[engineId], renderFormat } }));
        }}
        onGenerate={onGenerate}
        onDownload={onDownload}
        onRender={onRender}
      />

      <pre>{deployment ? JSON.stringify(deployment, null, 2) : "No deployment loaded"}</pre>
    </main>
  );
}
```

- [x] Create `src/test/render.test.ts` and paste:

```ts
import { describe, expect, it } from "vitest";
import { buildRenderUrl } from "@/features/render/render-service";

describe("render service", () => {
  it("builds kroki url for mermaid", () => {
    const url = buildRenderUrl(
      {
        engineId: "mermaid",
        fileExtension: ".mmd",
        mimeType: "text/plain",
        content: "flowchart LR\nA-->B"
      },
      "svg",
      "https://kroki.io"
    );

    expect(url.startsWith("https://kroki.io/mermaid/svg/")).toBe(true);
  });
});
```

##### Step 7 Verification Checklist
- [x] Mermaid and Structurizr render actions open a new browser tab.
- [x] Unsupported render options stay disabled.
- [x] Runtime config from `public/config.json` controls active engines and endpoint.

#### Step 7 STOP & COMMIT
**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

#### Step 8: Static deployment pipeline and self-host scaffolding
- [ ] Add CI pipeline, self-host docs, config templates, and setup scripts.
- [ ] Create `.github/workflows/build.yml` and paste:

```yaml
name: Build

on:
  push:
    branches: ["main", "feature/**"]
  pull_request:
    branches: ["main"]

jobs:
  test-build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run type-check
      - run: npm run test:run
      - run: npm run build
      - name: Upload dist artifact
        uses: actions/upload-artifact@v4
        with:
          name: web-dist
          path: dist/
```

- [ ] Replace `README.md` with:

```md
# ArcGIS Enterprise AsBuilt Diagram Generator

Static React app that ingests ArcGIS Enterprise system-report JSON and generates Structurizr and Mermaid artifacts.

## Local development

```powershell
npm install
npm run dev
```

## Build and test

```powershell
npm run type-check
npm run test:run
npm run build
```

## Self-host configuration

1. Copy `docker/config.example.json` to your host-accessible `public/config.json`.
2. Set `krokiEndpoint` to your internal Kroki URL.
3. Toggle diagram options with `active: true/false`.

## Output naming

ZIP files use:

`{deploymentSlug20}__{engineShortId}_{localYYYYMMDDHHmm}.zip`

## Disclaimer

This tool generates architecture diagrams from user-supplied ArcGIS Enterprise system report JSON and optional metadata.
Outputs are best-effort interpretations and may omit, simplify, or misrepresent environment details.
You are responsible for validating all generated artifacts before operational, security, compliance, procurement, or architectural decisions.
Use at your own risk.
```

- [ ] Create `docker/config.example.json` and paste:

```json
{
  "krokiEndpoint": "http://localhost:8000",
  "diagramOptions": {
    "structurizr": {
      "active": true
    },
    "mermaid": {
      "active": true
    }
  }
}
```

- [ ] Create `scripts/selfhost/setup.ps1` and paste:

```powershell
param(
  [string]$SourceConfig = "docker/config.example.json",
  [string]$TargetConfig = "public/config.json"
)

if (!(Test-Path $SourceConfig)) {
  Write-Error "Source config not found: $SourceConfig"
  exit 1
}

Copy-Item -Path $SourceConfig -Destination $TargetConfig -Force
Write-Output "Copied $SourceConfig to $TargetConfig"
Write-Output "Edit $TargetConfig to set your Kroki endpoint and active options."
```

- [ ] Create `scripts/selfhost/setup.sh` and paste:

```bash
#!/usr/bin/env bash
set -euo pipefail

SOURCE_CONFIG="docker/config.example.json"
TARGET_CONFIG="public/config.json"

if [ ! -f "$SOURCE_CONFIG" ]; then
  echo "Source config not found: $SOURCE_CONFIG" >&2
  exit 1
fi

cp "$SOURCE_CONFIG" "$TARGET_CONFIG"
echo "Copied $SOURCE_CONFIG to $TARGET_CONFIG"
echo "Edit $TARGET_CONFIG to set your Kroki endpoint and active options."
```

- [ ] Create `docs/selfhost.md` and paste:

```md
# Self-Hosted Setup

## Prerequisites
- Node 18+
- npm 9+
- Optional local Kroki (`http://localhost:8000`)

## Steps
1. Run `scripts/selfhost/setup.ps1` on Windows or `scripts/selfhost/setup.sh` on Linux/macOS.
2. Edit `public/config.json`.
3. Start app with `npm run dev`.

## Dry-run validation

```powershell
./scripts/selfhost/setup.ps1
Get-Content public/config.json
```

```bash
./scripts/selfhost/setup.sh
cat public/config.json
```
```

##### Step 8 Verification Checklist
- [ ] GitHub Actions workflow passes `type-check`, `test:run`, and `build`.
- [ ] `public/config.json` can be bootstrapped from `docker/config.example.json` using setup scripts.
- [ ] `docs/selfhost.md` instructions are executable and accurate.

#### Step 8 STOP & COMMIT
**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

## Final Validation Commands
Run after Step 8:

```powershell
npm run type-check
npm run test:run
npm run build
```

Expected outcome:
- TypeScript passes in strict mode.
- Unit tests pass across parser, validation, generation, rendering, and naming.
- Static artifacts build successfully for S3-ready deployment.
