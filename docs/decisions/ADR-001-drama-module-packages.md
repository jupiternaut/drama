# ADR-001: Drama Modules Use Package Boundaries

## Status
Accepted

## Date
2026-06-15

## Context
Drama now hosts three business surfaces that used to be coupled to the Electron app:

- Drama Graph: native graph schema, Storylet compatibility, graph persistence, and graph UI.
- Drama PLM: PlotPilot runtime/client contracts and React PLM workspace.
- Skill Crew: room inference, task binding, graph event helpers, and runtime adapters.

The previous implementation made Electron the business assembly point. That made desktop startup work, but it also made it too easy for Graph, PLM, and Crew code to depend on Electron preload globals, renderer aliases, or main-process internals.

## Decision
Keep a single monorepo and make each Drama area a package boundary:

- `@drama/core` owns canonical schema and event contracts.
- `@drama/host` owns host capability contracts for Electron, browser, and future Gecko-style shells.
- `@drama/graph` owns graph operations, Storylet adapters, storage helpers, and Graph IPC DTOs.
- `@drama/graph-ui` owns the browser-safe React Graph surface.
- `@drama/plm` owns PLM runtime/client/Codex contracts.
- `@drama/plm-ui` owns the browser-safe React PLM surface.
- `@drama/crew` owns Crew contracts and runtime subpath exports.

Electron remains the host shell. It can provide filesystem, IPC, tray, sidecar, and window lifecycle capabilities, but it should consume Drama modules through public package exports and pass host capabilities into UI modules through props.

## Consequences
- Package manifests now publish `dist/esm` and `dist/types` entries.
- Every Drama package has a local `build` script and `tsconfig.build.json`.
- The root `electron:build` runs `drama:build-packages` before building Electron.
- `scripts/check-drama-boundaries.ts` enforces that package source does not import Electron app paths or preload globals.
- `apps/drama-module-harness` verifies that Graph UI, PLM UI, and Crew public APIs can be consumed without Electron.

## Alternatives Considered

### Split Into Separate Apps
Rejected for now. It would multiply packaging and runtime lifecycle work before the module contracts are stable.

### Keep Source Exports Only
Rejected. Source exports are convenient during monorepo development, but they are not a stable installation boundary for package consumers.

### Bundle Everything Into Electron
Rejected. It preserves the original coupling problem and makes Graph/PLM/Crew hard to test independently.
