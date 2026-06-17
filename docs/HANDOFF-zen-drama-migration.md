# Handoff: Zen Drama Migration

## Status

Date: 2026-06-17

Drama has been migrated from the Electron-first path toward a Zen Browser hosted workbench. The current public-preview path is:

```text
Zen Browser chrome
  -> Zen sidebar buttons for Drama Graph / Drama PLM / Skill Crew
  -> Drama browser shell
  -> standalone Drama runtime at http://127.0.0.1:3198
  -> Graph / PLM / Crew package surfaces
```

Electron remains as a legacy compatibility path. It is not the primary host for the current migration.

## Repository Areas

| Area | Purpose |
| --- | --- |
| `apps/drama-browser-shell` | React browser shell used by the Zen hosted panel |
| `apps/drama-runtime` | Standalone local runtime for Graph, PLM, Crew, filesystem, and PlotPilot proxying |
| `packages/drama-core` | Shared Drama graph/event primitives |
| `packages/drama-graph` | Graph store, persistence, IPC contracts, Storylet adapter |
| `packages/drama-graph-ui` | Drama Graph React canvas surface |
| `packages/drama-plm` | PlotPilot runtime/client contracts |
| `packages/drama-plm-ui` | Drama PLM React surface, including the Script Studio UI |
| `packages/drama-crew` | Skill Crew runtime/event helpers |
| `packages/drama-host` | Browser/runtime host abstractions |
| `packages/drama-ui` | Shared Drama UI primitives and styles |
| `scripts/package-zen-drama-win.ps1` | Creates the Windows Zen Drama package directory |
| `scripts/install-zen-drama-package.ps1` | Installs the package into `%LOCALAPPDATA%\Programs\DramaZen` |
| `docs/ui-aesthetic-scorecard.md` | Current UI/UX scoring and acceptance table |
| `openspec/changes/zen-drama-workbench-ui` | OpenSpec baseline for the Zen workbench UI |

## Current UX State

Graph:

- Opens as a Zen sidebar/panel surface.
- Renders a full canvas workbench with toolbar, search, minimap, and inspector.
- Still needs stronger Obsidian/AFFiNE-style editing feel: multi-select, box select polish, richer edge editing, screenshot regression.

PLM:

- Opens as a Zen sidebar/panel surface.
- Uses the new light Script Studio layout: project navigation, chapter/beat list, central paper editor, script toolbar, and right-side control rail.
- Right rail now includes outline, relationship chain, progress, character-profile storage cards, prompt-storage cards, and a browser Web Audio music player.
- Runtime root `/` redirects to `/app/plm?host=zen&runtime=...`, so users no longer land on raw JSON.
- Still needs card edit/save, prompt registry writeback, generation streaming progress, and real PlotPilot parity completion.

Crew:

- Opens as a Zen sidebar/panel surface.
- Preserves crew tree, room feed, and AgentOS status layout.
- Still needs deeper AgentOS runtime parity and all agent outputs written as structured graph events.

## Verification Commands

Run these from the repository root:

```powershell
bun run browser-shell:typecheck
bun run browser-shell:build
bun run runtime:typecheck
bun run drama:build-packages
bun run zen:drama:package:win
bun run zen:drama:install:win
bun run zen:drama:install:verify:panel:win
```

Manual smoke:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File "$env:LOCALAPPDATA\Programs\DramaZen\Start-Drama-Zen.ps1" -Surface plm
```

Then open:

```text
http://127.0.0.1:3198/
```

Expected result: redirect to `/app/plm?...` and render the PLM Script Studio, not a JSON `NOT_FOUND` response.

## Packaging

Current Windows package output:

```text
dist/zen-drama-win-x64
```

The package includes:

- Zen browser binary tree
- Drama browser shell build
- Standalone Drama runtime bundle
- PlotPilot v4.6 source/runtime sidecar when available locally
- Launch scripts and desktop shortcut installer

`dist/` is intentionally ignored by Git. Upload package zips as GitHub release assets instead of committing them.

## Known Gaps

| Gap | Next Action |
| --- | --- |
| Graph editing not yet advanced-canvas grade | Continue Obsidian/AFFiNE-style editing work: box select, multi-select, edge creation/editing, keyboard shortcuts |
| PLM storage cards are display-first | Add edit/new/save, write character cards back to Bible, write prompt cards back to prompt registry |
| PLM generation feedback still coarse | Add streaming progress, invocation review state, retry/resume/commit UI |
| Crew runtime parity incomplete | Move remaining AgentOS execution details into package-level runtime and graph events |
| Runtime unavailable screenshot regression missing | Add automated screenshot checks for down-runtime and workspace-missing states |
| Package size is large | Consider a bootstrap installer that downloads Zen/PlotPilot dependencies instead of bundling everything |

## Public Release Boundary

This release is a public preview of the Zen Browser migration. It should not be described as:

- full PlotPilot parity,
- full AgentOS parity,
- final advanced Graph canvas,
- or a finished 90+ UI/UX product.

It is accurate to describe it as:

- a Zen Browser hosted Drama workbench,
- a de-Electronized main path with a local runtime,
- Graph / PLM / Crew package surfaces,
- and a PLM Script Studio prototype with right-side storage/control cards.

## Most Recent Validation

Validated locally on Windows:

- `packages/drama-plm-ui` typecheck passed.
- `browser-shell:typecheck` passed.
- `browser-shell:build` passed.
- `runtime:typecheck` passed.
- `zen:drama:package:win` passed.
- `zen:drama:install:win` passed.
- Browser smoke from `http://127.0.0.1:3198/` redirected to PLM and rendered Script Studio UI.
