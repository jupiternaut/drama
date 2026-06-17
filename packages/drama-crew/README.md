# @drama/crew

Drama Skill Crew room inference, graph event helpers, and runtime adapters.

## Public API
- `@drama/crew`: browser-safe room inference and graph event helpers.
- `@drama/crew/rooms`: room placement helpers.
- `@drama/crew/graph-events`: graph event creation helpers.
- Runtime subpaths such as `@drama/crew/skill-actor-runtime` and `@drama/crew/agentos-browser-use` are Node-capable host APIs.

## Boundary
The root export must remain browser-safe. Node-only runtime code is available only through explicit subpaths so renderer bundles do not accidentally include process, websocket, or browser-use runners.

## Commands
- `bun run typecheck`
- `bun run test`
- `bun run build`
