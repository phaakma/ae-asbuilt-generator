# ArcGIS Enterprise AsBuilt Diagram Generator (MVP)

**Branch:** `feature/asbuilt-diagram-generator-mvp`  
**Description:** Build a static React web app that ingests ArcGIS Enterprise JSON system reports and generates downloadable Structurizr and Mermaid diagram artifacts with optional render.

## Goal
Deliver an MVP that supports upload of ArcGIS Enterprise 11.5+ system-report JSON, metadata entry, theme selection, diagram generation, ZIP download, and render-in-new-tab.  
Keep architecture extensible so future diagram engines (for example Draw.io) can be added without rewriting core workflow.

## Implementation Steps

### Step 1: Project bootstrap and extensible architecture shell
**Files:** `package.json`, `vite.config.ts`, `tsconfig.json`, `src/main.tsx`, `src/App.tsx`, `src/domain/*`, `src/config/diagram-options.ts`  
**What:** Scaffold React + TypeScript static SPA with Calcite-based layout and define plugin contracts for diagram engines/renderers/themes. Register MVP engines (`structurizr`, `mermaid`) with capability metadata (generate/download/render).  
**Testing:** App boot smoke test, registry unit tests for engine loading/capabilities.

### Step 2: Upload, parse, and normalize ArcGIS report JSON
**Files:** `src/features/upload/*`, `src/domain/deployment-model.ts`, `src/parsers/arcgis-report-parser.ts`, `src/parsers/normalize.ts`  
**What:** Implement JSON upload and parser that normalizes deployment objects (portal, server sites, data stores, web adaptors, machines, relationships) into a stable internal model. Show uploaded file name and current local date in UI summary.  
**Testing:** Parser/normalizer tests using `sample1.json` and `sample2.json`, invalid JSON handling tests.

### Step 3: Metadata form and validation rules
**Files:** `src/features/metadata/*`, `src/utils/validation.ts`, `src/utils/slug.ts`  
**What:** Add metadata form fields: Deployment Name, Description, User Name, Email, Phone. Enforce:
- Deployment Name required, max 100 chars
- Deployment Name input allows letters/numbers/spaces/hyphens
- Email optional but must be valid format if present  
Use full Deployment Name (up to 100) in README content and derive normalized slug for filenames only.  
**Testing:** Unit/UI tests for validation and boundary cases (100-char limit, invalid email, spaces/hyphens accepted).

### Step 4: Diagram generation engines (Structurizr + Mermaid)
**Files:** `src/engines/structurizr/*`, `src/engines/mermaid/*`, `src/features/generate/generate-service.ts`, `src/config/themes.ts`  
**What:** Implement generators producing `.dsl` (Structurizr) and `.mmd` (Mermaid) from normalized deployment model with hardcoded theme options per engine. Ensure deterministic output naming and metadata context headers.  
**Testing:** Golden-file tests for generated artifacts from `sample1.json` and `sample2.json`; theme switching tests.

### Step 5: Diagram options table and job state workflow
**Files:** `src/features/jobs/*`, `src/features/options/DiagramOptionsTable.tsx`  
**What:** Build table with per-engine controls:
- Theme dropdown
- Render-format dropdown
- `Generate`, `Download`, `Render` buttons  
Implement state transitions:
- Initial: `Download` disabled, `Render` disabled or `UNAVAILABLE`
- Generating: spinner visible, actions locked
- Success: `Download` enabled, `Render` enabled only if capability exists  
**Testing:** Reducer/state-machine tests and UI interaction tests for each transition.

### Step 6: ZIP packaging and README generation
**Files:** `src/features/download/zip-builder.ts`, `src/features/download/readme-builder.ts`, `src/utils/file-naming.ts`  
**What:** Generate downloadable ZIP per engine containing:
- `README.md`
- Generated diagram source file(s)  
Filename pattern:
- `{deploymentSlug20}__{engineShortId}_{localYYYYMMDDHHmm}.zip`
- `deploymentSlug20` is normalized and capped at 20 chars  
README includes user metadata, tool/mode metadata, generation timestamp, and disclaimer text.  
**Testing:** ZIP content tests, filename-format tests (local time), slug normalization tests.

### Step 7: Rendering integration (examples in MVP)
**Files:** `src/features/render/*`, `src/config/runtime-config.ts`, `public/config.json`  
**What:** Add render service with example formats for MVP:
- Mermaid: `svg`, `png` (via Kroki)
- Structurizr: `svg`, `png` (via configured render path/Kroki-backed path)  
Render output opens in a new browser tab and handles unsupported options by disabling action.  
**Testing:** Mocked integration tests for render requests and new-tab open behavior.

### Step 8: Static deployment pipeline and self-host scaffolding
**Files:** `.github/workflows/build.yml`, `README.md`, `docs/*`, `docker/config.example.json`, `scripts/selfhost/setup.ps1`, `scripts/selfhost/setup.sh`  
**What:** Add CI build/test pipeline for static artifacts (S3-ready output). Add self-hosted first-PR scaffolding only:
- Editable config for active diagram options (`active: true/false`)
- Configurable Kroki endpoint
- Setup scripts and docs  
No full Docker image assembly in this PR.  
**Testing:** CI passes, config loading tests, script dry-run checks, docs verification.

## Draft README Disclaimer (for generated ZIP README.md)
This tool generates architecture diagrams from user-supplied ArcGIS Enterprise system report JSON and optional metadata.  
Outputs are best-effort interpretations and may omit, simplify, or misrepresent environment details.  
You are responsible for validating all generated artifacts before operational, security, compliance, procurement, or architectural decisions.  
Use at your own risk. The authors and contributors provide this software and generated outputs "as is", without warranties of any kind, express or implied, including accuracy, fitness for a particular purpose, and non-infringement.  
Do not include sensitive or regulated information in metadata unless your organization permits it.

## Test Strategy (PR-level)
- Unit tests: parser/normalizer, validation, slug/naming, engine generation, ZIP/README builders
- Integration tests: upload -> metadata -> generate -> download -> render flow
- Fixture coverage: `sample1.json` and `sample2.json` as baseline regression fixtures
- Build validation: static artifact generation in CI
