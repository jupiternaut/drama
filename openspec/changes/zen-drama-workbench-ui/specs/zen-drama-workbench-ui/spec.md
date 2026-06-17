# zen-drama-workbench-ui Specification

## Purpose

Define the observable UI contract for Drama when embedded in Zen Browser. The goal is a native-feeling Drama workbench inside Zen, not an unstyled webpage or debug route.

## ADDED Requirements

### Requirement: Zen-Hosted Workbench Frame

The system SHALL render Drama as a styled workbench surface inside Zen Browser's app-content area.

#### Scenario: Open Drama from Zen

- **GIVEN** Zen Browser is open with its sidebar and browser chrome visible
- **WHEN** the user opens Drama
- **THEN** Zen's sidebar and browser chrome remain visible
- **AND** Drama occupies the right workbench area
- **AND** the first viewport shows styled Drama chrome plus the selected tool surface
- **AND** the page does not render as browser-default text, default buttons, or raw document flow

#### Scenario: Preserve workbench identity

- **GIVEN** Drama is hosted by Zen
- **WHEN** the user switches between Graph, PLM, and Crew
- **THEN** the switcher uses compact icon-first Drama controls
- **AND** plain text links such as `Graph`, `PLM`, and `Crew` are not the primary navigation surface
- **AND** the route title and status use Drama/Warp styling

### Requirement: Visual Parity With Drama/Warp

The system SHALL preserve the compact dark Drama/Warp workbench style across Zen-hosted routes.

#### Scenario: Render styled controls

- **GIVEN** a Zen-hosted Drama route is loaded
- **WHEN** the first viewport is inspected
- **THEN** buttons, panels, inputs, badges, and toolbars use Drama/Warp styling
- **AND** browser-default form controls are not visible as primary UI
- **AND** colors come from Drama semantic tokens or the Zen-to-Drama token bridge

#### Scenario: Keep imported projections secondary

- **GIVEN** a route uses Storylet or PlotPilot data or runtime behavior
- **WHEN** the route renders labels and metadata
- **THEN** primary labels remain `Drama Graph`, `Drama PLM`, or `Skill Crew`
- **AND** `Storylet` and `PlotPilot` appear only as source, projection, runtime, or compatibility metadata

### Requirement: CSS Loading Contract

The system SHALL treat missing Drama CSS as a route failure, not an acceptable degraded rendering.

#### Scenario: CSS bundle available

- **GIVEN** the browser shell loads normally
- **WHEN** a Drama route mounts
- **THEN** the base reset, Drama/Warp tokens, route package styles, and Zen token bridge are applied before the route is marked ready

#### Scenario: CSS bundle unavailable

- **GIVEN** the CSS bundle cannot be loaded or initialized
- **WHEN** the route attempts to render
- **THEN** the user sees a styled failure panel
- **AND** the panel offers a retry action
- **AND** the route does not expose an unstyled default-HTML workbench

### Requirement: Graph Surface Contract

The system SHALL render Drama Graph as a full workbench canvas in Zen host mode.

#### Scenario: Open Graph

- **GIVEN** Drama is hosted by Zen
- **WHEN** the user opens Drama Graph
- **THEN** the graph canvas fills the available route viewport
- **AND** the toolbar, search, minimap, and inspector use Drama/Warp styling
- **AND** node cards remain readable and keep Storylet state-machine recognizability
- **AND** local graph paths appear only as compact monospace metadata

#### Scenario: Graph failure diagnostics

- **GIVEN** Graph data cannot be loaded
- **WHEN** Drama Graph renders the error
- **THEN** the error appears in a styled diagnostics panel
- **AND** raw stack traces, raw JSON, or plain text dumps do not dominate the first viewport

### Requirement: PLM Surface Contract

The system SHALL render Drama PLM as a native Drama writing workbench in Zen host mode.

#### Scenario: Open PLM

- **GIVEN** Drama is hosted by Zen
- **WHEN** the user opens Drama PLM
- **THEN** the first viewport renders a native Script Studio with left project navigation, a central chapter paper, a script tool toolbar, and a right-side control rail
- **AND** PlotPilot styling does not become the outer shell
- **AND** generation status and failure reports are shown in structured side panels
- **AND** character-profile and prompt-storage cards are available in the right-side rail
- **AND** the music player appears as a secondary bottom control and does not compete with the writing paper

### Requirement: Skill Crew Surface Contract

The system SHALL render Skill Crew as a native Drama crew workbench in Zen host mode.

#### Scenario: Open Skill Crew

- **GIVEN** Drama is hosted by Zen
- **WHEN** the user opens Skill Crew
- **THEN** the crew tree, active room feed, and AgentOS status area use the Electron-era dense workbench structure
- **AND** agent output appears as structured events or cards
- **AND** the route does not fall back to plain text logs as the main UI

### Requirement: Runtime Failure States

The system SHALL provide styled recovery states for unavailable local runtime services.

#### Scenario: Local runtime unavailable

- **GIVEN** Zen opens the Drama panel
- **AND** the local Drama runtime is not reachable
- **WHEN** the panel renders
- **THEN** the user sees a compact Drama-styled unavailable state
- **AND** the state includes retry and diagnostic actions where supported
- **AND** the panel does not show a blank page or browser network error as the primary experience

#### Scenario: User opens the runtime root

- **GIVEN** the standalone Drama runtime is running
- **WHEN** the user opens `http://127.0.0.1:3198/`
- **THEN** the runtime redirects to the Drama PLM workbench route
- **AND** the first viewport renders the styled Drama UI
- **AND** the root path does not expose raw JSON, `NOT_FOUND`, or debug text as the primary experience

#### Scenario: PLM sidecar unavailable

- **GIVEN** Drama PLM is open
- **AND** the PlotPilot-compatible sidecar is unavailable
- **WHEN** the PLM route renders
- **THEN** PLM-specific unavailable status appears inside the Drama PLM workbench
- **AND** Graph and Skill Crew navigation remain usable

### Requirement: Windows Workspace Metadata

The system SHALL display Windows workspace paths as metadata without breaking layout.

#### Scenario: Long Windows path

- **GIVEN** the active workspace path is a long Windows path
- **WHEN** the Zen-hosted workbench displays it
- **THEN** the path uses monospace metadata styling
- **AND** it truncates or wraps within its container
- **AND** it does not become the page title or push the tool surface off screen
