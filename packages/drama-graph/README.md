# @drama/graph

Drama Graph operations, Storylet compatibility, storage helpers, and Graph IPC DTOs.

## Public API
- `@drama/graph`: graph creation, mutation, diagnostics, Storylet conversion, and native graph model helpers.
- `@drama/graph/storylet-types`: Storylet compatibility types.
- `@drama/graph/ipc-contract`: host-neutral Graph IPC DTOs.
- `@drama/graph/node-store`: Node/Electron-side graph store implementation.
- `@drama/graph/project-files`: project file recording helpers.

## Boundary
Core graph logic must stay host-neutral. Node-side storage helpers are exported through explicit subpaths so browser consumers can avoid them.

## Commands
- `bun run typecheck`
- `bun run test`
- `bun run build`
