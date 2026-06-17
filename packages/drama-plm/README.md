# @drama/plm

Drama PLM runtime, PlotPilot client, and Codex OAuth contracts.

## Public API
- `@drama/plm`: runtime, client, Codex, and PlotPilot DTO exports.
- `@drama/plm/runtime`: Python sidecar runtime contracts.
- `@drama/plm/codex`: Codex OAuth status/login DTOs.
- `@drama/plm/client`: typed PlotPilot HTTP client.
- `@drama/plm/plotpilot-types`: PlotPilot API DTOs.

## Boundary
The client and DTOs are safe to share with UI packages. Runtime code is exposed through a dedicated subpath and should be hosted by Electron or another Node-capable shell.

## Commands
- `bun run typecheck`
- `bun run test`
- `bun run build`
