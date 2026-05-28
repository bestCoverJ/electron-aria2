## ADDED Requirements

### Requirement: Platform immersive shell
The system SHALL use platform-appropriate immersive shell styling for the left menu and top title/toolbar areas while keeping main download content readable on white surfaces.

#### Scenario: Windows immersive shell
- **WHEN** Tide X runs on Windows with supported Electron background materials
- **THEN** the main window uses Mica-compatible background behavior for shell areas and preserves readable foreground contrast.

#### Scenario: macOS immersive shell
- **WHEN** Tide X runs on macOS with supported vibrancy effects
- **THEN** the main window uses vibrancy or blur for shell areas and preserves readable foreground contrast.

#### Scenario: Unsupported shell effects
- **WHEN** the current platform or Electron build does not support Mica or vibrancy
- **THEN** the renderer uses the design-system fallback colors, borders, and translucent surfaces without blocking application startup.

### Requirement: Utility-sized full window
The system SHALL open the full dashboard as a compact desktop utility window rather than a large web dashboard.

#### Scenario: Full dashboard initial bounds
- **WHEN** the user opens Tide X in full dashboard mode
- **THEN** the window opens near the design-system target size and respects a practical minimum size that keeps the left menu, download list, and detail pane usable.

#### Scenario: Secondary pane at narrow width
- **WHEN** the full dashboard becomes too narrow for all panes
- **THEN** the right detail pane is hidden or collapsed before horizontal scrolling is introduced in the download list.

### Requirement: Real compact window mode
The system SHALL implement compact mode as an Electron window mode that changes actual BrowserWindow bounds and native frame behavior.

#### Scenario: Enter compact mode
- **WHEN** the user activates compact mode from the full dashboard
- **THEN** the application stores the previous full-window bounds, resizes to a compact utility window, and presents a frameless compact surface.

#### Scenario: Restore full mode
- **WHEN** the user double-clicks the compact surface
- **THEN** the application restores the framed full dashboard using the previously stored full-window bounds when available.

#### Scenario: Window mode is controlled by main process
- **WHEN** the renderer requests a compact/full mode transition
- **THEN** the main process performs the BrowserWindow mutation or recreation through typed preload IPC.
