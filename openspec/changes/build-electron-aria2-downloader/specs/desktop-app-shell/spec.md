## ADDED Requirements

### Requirement: Cross-platform desktop shell
The system SHALL provide an Electron desktop application shell that starts the renderer, exposes a secure preload API, and manages application lifecycle consistently across Windows, macOS, and Linux.

#### Scenario: Application starts
- **WHEN** the user launches the desktop application
- **THEN** the system opens the main download manager window and initializes required main-process services before renderer actions are available

#### Scenario: Renderer requests privileged behavior
- **WHEN** renderer code needs to read settings, control downloads, or use operating-system integrations
- **THEN** the system MUST perform the privileged operation through the preload IPC API rather than direct renderer access to Node.js or aria2 RPC

### Requirement: Tray and close behavior
The system SHALL support tray integration for quick access, background operation, and controlled quit behavior.

#### Scenario: User closes the main window
- **WHEN** the user closes the main application window while downloads are active
- **THEN** the system keeps the application running in the tray unless the user explicitly chooses to quit

#### Scenario: User exits from tray
- **WHEN** the user selects quit from the tray menu
- **THEN** the system saves application state and shuts down managed background services according to the configured shutdown policy

### Requirement: Desktop notifications
The system SHALL notify users about important task events without requiring the main window to stay focused.

#### Scenario: Download completes
- **WHEN** a download task reaches the completed state
- **THEN** the system displays a desktop notification with the task name and an action path to reveal the file or task

#### Scenario: Download fails
- **WHEN** a download task enters the failed state
- **THEN** the system displays a failure notification with a concise reason when the operating system allows notifications

### Requirement: Local settings persistence
The system SHALL persist user settings locally and reload them on application start.

#### Scenario: User changes download directory
- **WHEN** the user selects a new default download directory
- **THEN** the system saves the setting and applies it to newly created download tasks

#### Scenario: Application restarts
- **WHEN** the user relaunches the application
- **THEN** the system restores the last saved settings before accepting new download tasks
