## Why

The current Zen-hosted Drama page can render as an unstyled web document: browser-default text, raw buttons, visible debug strings, and a top row of plain text route links. That is not the product target.

The intended experience is the earlier Drama workbench UI embedded inside Zen Browser:

- Zen keeps its own browser chrome, sidebar, tabs, and window behavior.
- Drama appears as a right-side workbench surface inside Zen, not as a random webpage.
- Graph, PLM, and Skill Crew keep the compact Drama/Warp visual system.
- Storylet and PlotPilot identities remain projection/source metadata, not the app chrome.

This change freezes that UI direction so implementation work has a concrete acceptance line.

## What Changes

- Add a formal UI contract for the Zen-hosted Drama workbench.
- Require styled Drama shell rendering before any Graph/PLM/Crew route is considered usable.
- Preserve the Electron-era Drama structure where it matters:
  - compact top/left tool entry area
  - workbench content to the right
  - dense dark panels
  - icon buttons instead of raw text controls
  - Graph canvas, PLM editor, and Skill Crew surfaces rendered as first-class Drama tools
- Define failure states for runtime down, CSS missing, route loading, and local workspace path display.

## Capabilities

### New Capabilities

- `zen-drama-workbench-ui`: Zen Browser hosted Drama panel, Drama shell layout, visual parity, failure states, and route-specific surface contracts.

### Modified Capabilities

- `deelectronized-drama-host`: The browser-hosted shell must look and behave like a native workbench, not a standalone debug page.
- `drama-module-packages`: Graph, PLM, and Crew UI packages must remain consumable by both the legacy Electron shell and the Zen/browser shell without visual collapse.

## Impact

- Primary implementation areas:
  - `apps/drama-browser-shell`
  - `packages/drama-graph-ui`
  - `packages/drama-plm-ui`
  - `packages/drama-crew`
  - `packages/drama-host`
  - Zen integration scripts and package verification
- Verification:
  - Screenshot checks in Zen host mode
  - CSS/theme loading checks
  - Route rendering checks for Graph, PLM, and Crew
  - Failure-state checks for unavailable local runtime

## Non-Goals

- Rewriting Graph, PLM, or Crew as XUL.
- Reintroducing Electron as the production host.
- Matching Storylet or PlotPilot original visual styles as the outer shell.
- Shipping a landing page, marketing page, or debug page as the Drama entry screen.
