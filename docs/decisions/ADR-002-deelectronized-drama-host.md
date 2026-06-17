# ADR-002: De-Electronize Drama Through Host Capabilities

## Status
Accepted

## Date
2026-06-16

## Context
The local Zen Browser source at `C:\Users\gengr\Downloads\open-source-clients\zen-browser` is a Firefox/Gecko distribution, not an Electron alternative shell. Its desktop architecture is built around Firefox source layout, `mach`, chrome resources, XUL/XHTML overlays, `.sys.mjs` modules, native browser widgets, preferences, and browser chrome CSS.

Relevant Zen source areas reviewed:

- `README.md`: build/start flow uses `surfer` and Firefox `mach`.
- `src/zen/common/modules`: startup, session, UI manager, and browser customization modules.
- `src/zen/common/styles`: browser chrome theme, sidebar, toolbar, and tab styling.
- `src/zen/glance`, `src/zen/split-view`, `src/zen/tabs`: feature UI implemented as browser chrome resources.

Drama currently still has an Electron host with `main`, `preload`, and `renderer` code. Even after Graph, PLM, and Crew were moved into packages, large parts of the renderer still call `window.electronAPI`, and Electron still owns native lifecycle, tray, dialog, shell, file, RPC, and sidecar startup.

## Decision
Do not fork Zen/Gecko as the first implementation step. Instead, make Drama host-agnostic by introducing `@drama/host` as the contract between Drama UI packages and the runtime shell.

The host contract must represent generic capabilities:

- shell: open URL, open file, reveal file.
- files: read and write local project files.
- dialogs: confirm, open file, save file.
- clipboard: read and write text.
- lifecycle: focus existing window and quit.
- notifications: show native or browser notifications.
- rpc/events: request-response and subscription channels.

Electron becomes one implementation of this contract. A browser harness becomes another implementation. A future Zen/Gecko-style host can implement the same contract through browser chrome modules, a WebExtension/native bridge, or a loopback local runtime.

## Migration Plan

1. Introduce `@drama/host` and wire it into package build, boundary checks, and the non-Electron harness.
2. Add an Electron adapter that implements `DramaHostApi` over the existing preload bridge.
3. Replace renderer `window.electronAPI` reads with injected `DramaHostApi` plus feature-specific APIs.
4. Move filesystem, graph store, PLM sidecar, and Crew runtime access behind local server/RPC boundaries that do not require Electron IPC.
5. Build a browser-first Drama shell that loads Graph, PLM, and Crew from package APIs and connects to the local runtime over HTTP/WebSocket.
6. Only after the browser shell is stable, evaluate a Gecko/Zen shell. At that point the question becomes packaging and native integration, not business logic migration.
7. Remove Electron build scripts, dependencies, preload globals, and app lifecycle code after parity is reached.

## Constraints

- Drama feature packages must not import Electron, Electron app paths, preload globals, or Node APIs from browser-safe UI code.
- Feature-specific APIs stay in their feature packages. `@drama/host` is only for generic shell capability contracts.
- The non-Electron harness must continue to build; it is the smoke test that UI packages can run without Electron.
- Electron cannot be deleted until startup, OAuth, Graph persistence, PLM runtime, Crew events, file dialogs, external links, and quit/focus behavior have host-independent replacements.

## Consequences

- The phrase "de-Electronized" now has a concrete definition: Drama UI and business packages consume host capabilities through contracts, not Electron-specific globals.
- The Zen Browser source is used as an architectural reference for browser-native chrome separation, not as code to paste into Drama.
- Full removal of Electron becomes an incremental migration with measurable checkpoints rather than a high-risk rewrite.
