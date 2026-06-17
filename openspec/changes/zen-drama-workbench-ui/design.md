## Context

Drama has already been modularized enough that Graph, PLM, and Crew can be consumed outside the Electron renderer. The current Zen route proves the runtime can be reached, but it does not prove product-quality embedding because the visual shell can degrade into default browser HTML.

The design target is:

```text
Zen Browser chrome
  -> Zen sidebar button / command / panel lifecycle
  -> Drama workbench frame
    -> left or top compact Drama tool selector
    -> route surface: Graph, PLM, or Skill Crew
    -> local runtime status and recovery actions
```

## Decisions

### 1. Zen owns the host frame, Drama owns the workbench

Zen should provide the sidebar icon, command, panel container, close behavior, and theme variables. Drama should provide the workbench frame and the Graph/PLM/Crew UI.

The embedded view must not look like a normal webpage opened in a tab. It must sit inside Zen's app-content area while preserving Zen's left sidebar and browser controls.

### 2. Use a Drama workbench shell in the browser app

`apps/drama-browser-shell` should provide a shared shell for `/graph`, `/plm`, and `/crew`:

- compact app chrome
- icon-first route controls
- runtime readiness badge
- source/workspace metadata
- route content viewport
- consistent loading, empty, and failure states

Plain text links such as `Graph PLM Crew` are not acceptable as the primary route switcher.

### 3. Load CSS as a hard dependency

The browser shell should fail visibly and intentionally if the Drama stylesheet cannot load. A route rendered with default browser styling is a broken state, not a degraded state.

The shell should import:

- base reset
- Drama/Warp design tokens
- route package styles for Graph, PLM, and Crew
- Zen variable bridge when `host=zen`

### 4. Bridge Zen tokens into Drama tokens

When hosted by Zen, the shell should map Zen variables into Drama variables, for example:

```css
:root[data-host="zen"] {
  --drama-bg: var(--zen-main-browser-background);
  --drama-border: var(--zen-colors-border);
  --drama-radius: var(--zen-border-radius);
  --drama-accent: var(--zen-primary-color);
}
```

Drama components should keep their own semantic tokens and consume this bridge instead of directly depending on every Zen variable.

### 5. Preserve route-specific workbench expectations

Graph:

- canvas fills the main viewport
- minimap stays anchored
- inspector is a right-side workbench panel or a collapsible drawer
- node cards keep Storylet state-machine recognizability inside the Drama shell
- local file paths are monospace metadata, never page titles

PLM:

- editor, chapter, bible, invocation, and runtime status surfaces render as Drama panels
- PlotPilot original blue/purple SaaS styling does not become the shell
- generation failure reports appear in a structured side panel

Skill Crew:

- crew tree, room/moment feed, and AgentOS status keep the Electron-era dense workbench shape
- agent output appears as events or structured cards, not plain text dump

### 6. Failure states are designed states

The shell must handle:

- local runtime unavailable
- route package failed to load
- CSS bundle failed to load
- workspace path missing
- PLM sidecar down

Each case should show a compact Drama-styled recovery panel with retry/open-log actions where available.

### 7. Verification is visual and structural

Automated checks should capture screenshots for:

- Zen-hosted Graph route
- Zen-hosted PLM route
- Zen-hosted Crew route
- runtime unavailable state

Checks should fail when browser-default buttons, unstyled text flow, or raw JSON/debug dumps dominate the first viewport.

## Risks / Trade-offs

**Risk: Browser shell duplicates Electron shell code**

Mitigation: move shared shell primitives into package-level UI modules only after the shape stabilizes. Do not block the immediate fix on a large design-system refactor.

**Risk: Zen variables drift**

Mitigation: keep a small token bridge and default fallbacks. Drama components should use Drama semantic tokens.

**Risk: Overfitting to screenshots**

Mitigation: screenshot checks should verify structure, styling, and viewport occupancy, not pixel-perfect equality.

## Implementation Approach

1. Build a `DramaWorkbenchShell` in the browser shell using existing route packages.
2. Move current route links into icon-first shell navigation.
3. Import and verify all required CSS bundles.
4. Add host-specific token bridge for `host=zen`.
5. Add route-level loading and failure panels.
6. Add Playwright or equivalent screenshot checks for Zen host mode.
