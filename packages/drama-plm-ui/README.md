# @drama/plm-ui

Browser-safe React surface for Drama PLM.

## Public API
- `@drama/plm-ui`: PLM page and container exports.
- `@drama/plm-ui/PlotPilotNativePage`: pure PLM page component.
- `@drama/plm-ui/PlotPilotNativeContainer`: stateful container that receives host APIs and a PlotPilot client factory.

## Host Contract
Consumers must provide `PlotPilotNativeApi` when using the container. The UI package must not call `window.electronAPI`, import Electron, or own sidecar lifecycle directly.

## Commands
- `bun run typecheck`
- `bun run build`
