# @drama/graph-ui

Browser-safe React surface for Drama Graph.

## Public API
- `@drama/graph-ui`: Graph page and container exports.
- `@drama/graph-ui/StoryletNativeGraphPage`: pure page component.
- `@drama/graph-ui/StoryletNativeGraphContainer`: stateful container that receives host graph APIs through props.

## Host Contract
Consumers must provide a `DramaGraphUiApi`. The UI package must not call `window.electronAPI`, import Electron, or access the filesystem directly.

## Commands
- `bun run typecheck`
- `bun run build`
