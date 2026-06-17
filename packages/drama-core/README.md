# @drama/core

Canonical Drama schema and graph event contracts.

## Public API
- `@drama/core`: graph schema, graph events, repository contracts, and helpers.
- `@drama/core/graph`: graph-only schema/event/repository exports.

## Boundary
This package must stay platform-neutral. It should not import Electron, React, filesystem APIs, or host runtime code.

## Commands
- `bun run typecheck`
- `bun run test`
- `bun run build`
