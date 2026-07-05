# Drama

Internal Drama and Zen Browser fork of the Craft Agents codebase.

This repository is not a normal Craft Agents distribution. It carries the Drama/Zen workbench direction: a browser-hosted shell, standalone local Drama runtime, Electron compatibility code, Windows Zen packaging scripts, and PlotPilot integration shims. PlotPilot itself is not vendored in this repository.

## Table of Contents

- [Background](#background)
- [Install](#install)
- [Usage](#usage)
- [Repository Layout](#repository-layout)
- [Status](#status)
- [Maintainer](#maintainer)
- [Contributing](#contributing)
- [License and Upstream](#license-and-upstream)

## Background

The original Craft Agents README described a general desktop agent product. This fork should be read differently:

- Upstream lineage: Craft Agents / Craft Agents OSS.
- Local identity: internal Drama/Zen fork for Graph, PLM, Crew, and runtime packaging experiments.
- Main product direction: Zen Browser hosted Drama workbench backed by a standalone local runtime.
- Legacy compatibility: Electron code still exists under `apps/electron`, but it is not the only boundary a reader should use to understand the project.
- PlotPilot boundary: this repo contains integration code such as `packages/drama-plm`, PLM UI surfaces, PlotPilot runtime/client contracts, and boot shims. It does not contain a vendored PlotPilot source tree.

## Install

Requirements for local development:

- Bun
- Node-compatible tooling used by the monorepo
- PowerShell for Windows Zen packaging and install scripts
- Electron tooling only when working on the legacy desktop path

Clone this fork:

```sh
git clone https://github.com/jupiternaut/drama.git
cd drama
bun install
```

## Usage

Useful development commands from the repository root:

```sh
bun run browser-shell:typecheck
bun run browser-shell:build
bun run runtime:typecheck
bun run drama:build-packages
bun run validate:drama-modules
```

Zen Drama development:

```sh
bun run zen:drama:dev
```

Windows package path:

```powershell
bun run zen:drama:package:win
bun run zen:drama:package:verify:win
bun run zen:drama:install:win
bun run zen:drama:install:verify:panel:win
```

Legacy Electron path:

```sh
bun run electron:start
```

Treat Electron commands as compatibility and packaging work, not as the whole project identity.

## Repository Layout

- `apps/electron/` - legacy Electron desktop shell, resources, document tools, PlotPilot bridge code, and compatibility packaging.
- `apps/webui/` - web UI surface from the Craft Agents codebase.
- `apps/drama-browser-shell/` - React browser shell used by the Drama/Zen workbench.
- `apps/drama-runtime/` - standalone local runtime for Drama surfaces and local service proxying.
- `apps/drama-module-harness/` - harness for testing Drama modules outside the full host.
- `CraftAgents/` - Swift/Xcode client area inherited from Craft Agents work.
- `packages/drama-core/` - Drama graph and event primitives.
- `packages/drama-graph/` and `packages/drama-graph-ui/` - graph persistence contracts and React graph UI.
- `packages/drama-host/` - host/runtime abstractions for browser integration.
- `packages/drama-plm/` and `packages/drama-plm-ui/` - PlotPilot-facing runtime contracts and PLM UI.
- `packages/drama-crew/` - Skill Crew runtime helpers and theater/room experiments.
- `packages/shared/`, `packages/server-core/`, `packages/server/`, `packages/session-*` - inherited Craft Agents server, shared, and session infrastructure.
- `scripts/package-zen-drama-win.ps1`, `scripts/install-zen-drama-package.ps1`, `scripts/launch-zen-drama.ps1` - Windows Zen package/install/launch path.
- `scripts/check-drama-boundaries.ts` - local guard for Drama package boundaries.
- `docs/` and `openspec/` - handoff, architecture, ADR, and change-spec material for the Drama/Zen direction.

## Status

Active internal fork. The README is intentionally scoped to repository identity and source boundaries for handoff readers.

Known boundary notes:

- This is not the upstream Craft Agents README.
- PlotPilot is integrated through contracts and shims, but PlotPilot source is supplied separately or at package time.
- Windows Zen packaging scripts exist, but built `dist/` outputs are not source.
- Electron is still present for legacy compatibility, so do not infer the whole project from `apps/electron` alone.

## Maintainer

Maintained in the `jupiternaut/drama` fork.

## Contributing

Keep changes scoped to the relevant surface:

- Drama browser/runtime changes should update the corresponding package or app.
- Packaging changes should name the target platform and verification command.
- PlotPilot-related changes should preserve the not-vendored source boundary.
- README changes should keep upstream Craft Agents claims separate from Drama/Zen fork claims.

Run the smallest relevant validation command before pushing. For broad Drama changes, prefer:

```sh
bun run validate:drama-modules
```

## License and Upstream

Licensed under Apache-2.0. See [LICENSE](LICENSE).

This repository descends from Craft Agents / Craft Agents OSS work but is maintained as the `jupiternaut/drama` Drama/Zen fork. Upstream Craft Agents installation and product claims should not be copied here unless the local source tree still supports them.
