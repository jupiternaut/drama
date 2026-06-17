## 1. Baseline and Guardrails

- [x] 1.1 Capture current broken Zen-hosted `/graph?host=zen` screenshot as a regression fixture
- [x] 1.2 Capture working Electron-era Drama Graph and Skill Crew screenshots as visual reference fixtures
- [x] 1.3 Add a structural smoke check that fails when the shell renders browser-default buttons or raw document flow

## 2. Browser Workbench Shell

- [x] 2.1 Create a shared `DramaWorkbenchShell` for `apps/drama-browser-shell`
- [x] 2.2 Replace plain text route links with compact icon-first Graph / PLM / Crew controls
- [x] 2.3 Add runtime status, workspace metadata, and route title as styled shell chrome
- [x] 2.4 Ensure Zen's sidebar and browser chrome remain visible while Drama occupies the right workbench area

## 3. Theme and CSS Loading

- [x] 3.1 Import base reset and Drama/Warp token CSS into the browser shell entrypoint
- [x] 3.2 Import required Graph, PLM, and Crew package styles in host mode
- [x] 3.3 Add `host=zen` token bridge that maps Zen variables into Drama semantic variables
- [x] 3.4 Add a visible styled failure state when the CSS bundle fails to initialize

## 4. Route Surface Parity

- [x] 4.1 Restore Graph route to full-canvas workbench layout with toolbar, minimap, and inspector
- [x] 4.2 Restore PLM route to native Script Studio layout with chapter paper, script toolbar, right control rail, storage cards, and music player
- [x] 4.3 Restore Skill Crew route to crew tree, room feed, and AgentOS status layout
- [x] 4.4 Keep Storylet and PlotPilot names as source metadata, not outer app navigation

## 5. Failure and Empty States

- [x] 5.1 Add styled runtime-unavailable panel with retry and log actions
- [x] 5.2 Add styled PLM-sidecar-down panel
- [ ] 5.3 Add styled workspace-missing panel
- [x] 5.4 Ensure raw JSON, stack traces, and debug strings do not dominate the first viewport
- [x] 5.5 Redirect runtime root `/` to the PLM workbench so users do not land on raw JSON

## 6. Verification

- [x] 6.1 Add screenshot verification for Zen Graph, PLM, and Crew routes
- [ ] 6.2 Add screenshot verification for runtime unavailable state
- [x] 6.3 Run `bun run browser-shell:typecheck`
- [x] 6.4 Run `bun run browser-shell:build`
- [x] 6.5 Run Zen Drama panel verification script after implementation
- [x] 6.6 Run installed package root redirect smoke for `http://127.0.0.1:3198/`
