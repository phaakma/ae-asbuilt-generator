# ArcGIS Enterprise As-Built Diagram Generator

A browser-based tool that converts an ArcGIS Enterprise system report (`.json`) into diagram artifacts you can download and render.

This project is intended for ArcGIS Enterprise administrators and architects who want fast, repeatable as-built documentation.

## What This Project Does

- Accepts ArcGIS Enterprise system report JSON files (11.5+ export format).
- Lets you enter deployment metadata (name, description, contact info).
- Generates diagram artifacts for supported engines (currently Structurizr and Mermaid).
- Packages outputs as downloadable ZIP files with generated diagram files and a README.
- Optionally renders diagrams through Kroki.

## Live Demo (GitHub Pages)

Once deployed, you can try the app online at:

`https://<your-github-username-or-org>.github.io/<your-repo-name>/`

Example:

`https://acme-org.github.io/ae-asbuilt-tool/`

## Tech Stack

- React 18
- TypeScript
- Vite
- ArcGIS Calcite Components
- Vitest + Testing Library

## Prerequisites

- Node.js 18+
- npm 9+

## Install

```bash
npm ci
```

## Run Locally (Development)

```bash
npm run dev
```

Vite will print a local URL (usually `http://localhost:5173`).

## Build as Static App

```bash
npm run build:static
```

Build output is written to `dist/`.

## Preview the Production Build

```bash
npm run preview:pages
```

## Run Tests

```bash
npm run test:run
```

## Configuration

Runtime config is loaded from `public/config.json` at startup.

Current key settings include:

- `krokiEndpoint`: URL for rendering service (defaults to `https://kroki.io`)
- `diagramOptions`: per-engine on/off toggle


## Deployment (GitHub Pages)

Deployment automation is included via GitHub Actions in `.github/workflows/deploy-pages.yml`.

At the bottom of your setup checklist:

1. Push this repository to GitHub and ensure the default branch is `main`.
2. In GitHub, open `Settings` -> `Pages`.
3. Set `Source` to `GitHub Actions`.
4. Commit and push changes to `main`.
5. Wait for the `Deploy static app to GitHub Pages` workflow to complete in the `Actions` tab.
6. Open your deployed site at:
   - `https://<owner>.github.io/<repo>/` for project pages, or
   - `https://<owner>.github.io/` if your repo name is exactly `<owner>.github.io`.

### Manual Build for GitHub Pages Path (Optional)

For local verification of repo-subpath hosting:

```bash
# Windows PowerShell
$env:VITE_BASE_PATH = "/<repo-name>/"
npm run build:pages
```

The deployment workflow computes this base path automatically on GitHub Actions.
