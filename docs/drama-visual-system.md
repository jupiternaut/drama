# Drama Visual System

This file fixes the UI baseline for the Zen-hosted Drama workbench. The goal is not to copy Storylet, PlotPilot, or Craft Agent styling. Drama uses a restrained Zen/Craft shell with a dense Warp-like dark workspace inside.

## Product Target

- UI/UX aesthetics target: 90+
- Product maturity target: 80+
- Primary references: Craft Docs for calm structure, Zen Browser for native host feeling, Warp for dense dark tool surfaces.
- Workflow references: Claude and Penpot for information architecture, not visual language.

## Tokens

The executable token source is `apps/drama-browser-shell/src/styles.css`.

- Background: near-black layered surfaces, never one-note blue/purple.
- Accent: quiet blue-lavender only for focus, selected edges, and status emphasis.
- Radius: 4-12px. Cards and panels stay at 8px unless the host requires otherwise.
- Text: system sans for UI, monospace only for ids, counts, and diagnostics.
- Borders: low-contrast hairlines; avoid high-glow panels.

## Workbench Shell

- Zen host mode must feel like a native browser panel, not a web page.
- Surface entry points are icon-only in Zen host mode with tooltips.
- Top bar shows product/workspace/mode/save state. It must not show localhost URLs, absolute paths, or debug source names.
- Runtime and host status use small low-noise chips.
- CSS failure must show the styled critical fallback, never default HTML controls.

## Graph First Screen

- Graph is the aesthetic front door of Drama.
- The first viewport must show canvas, nodes, relationships, inspector, minimap, and a compact toolbar.
- Long file paths stay out of the first viewport. Use `.drama/...` display paths and keep full paths in tooltip/confirm flows only.
- Developer JSON and source references are collapsed by default.
- Node cards preserve Storylet's state-machine identity but use Drama tokens for surface, border, selected state, and shadows.

## Interaction Baseline

- Required: drag-save node positions, multi-select, box-select, copy/paste, delete, search focus with `Ctrl/Cmd+F`, auto-layout, alignment tools, minimap, zoom controls.
- Graph operations write to the Drama graph persistence layer, not iframe or localhost state.
- Agent, PLM, and Graph events should appear as graph events instead of loose debug text.

## Anti-Patterns

- Do not reintroduce text-link tabs for Graph/PLM/Crew in Zen host mode.
- Do not expose `C:\Users\...`, `localhost`, or raw source JSON in primary UI.
- Do not add a new button/card style without mapping it to the token set first.
- Do not make PLM look like PlotPilot's original blue/purple SaaS UI inside Drama.
- Do not make Graph look like unstyled React Flow or a debugging canvas.
