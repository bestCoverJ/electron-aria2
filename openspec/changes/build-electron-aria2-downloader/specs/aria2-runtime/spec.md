## ADDED Requirements

### Requirement: Embedded aria2c runtime
The system SHALL bundle and use a platform-specific aria2c executable rather than requiring users to install aria2 separately.

#### Scenario: Runtime starts successfully
- **WHEN** the desktop application starts
- **THEN** the system locates the bundled aria2c executable for the current platform and starts it with the required RPC and session options

#### Scenario: Runtime binary is missing
- **WHEN** the bundled aria2c executable cannot be found or executed
- **THEN** the system reports a recoverable runtime error in the UI and prevents download actions that require aria2

### Requirement: Secure local JSON-RPC connection
The system SHALL communicate with aria2 through a local JSON-RPC endpoint protected by a secret token.

#### Scenario: Main process connects to aria2
- **WHEN** the main process starts aria2
- **THEN** the system binds aria2 RPC to localhost and uses a generated or persisted RPC secret for all requests

#### Scenario: Renderer needs task data
- **WHEN** the renderer requests task state
- **THEN** the system returns normalized task data through IPC without exposing the aria2 RPC URL or secret to renderer code

### Requirement: Runtime lifecycle management
The system SHALL monitor and control the aria2 process lifecycle from the Electron main process.

#### Scenario: aria2 exits unexpectedly
- **WHEN** the aria2 process exits while the application is running
- **THEN** the system marks runtime-dependent operations unavailable, surfaces the error, and attempts recovery according to the configured retry policy

#### Scenario: Application quits
- **WHEN** the user explicitly quits the application
- **THEN** the system saves the aria2 session and shuts down the managed aria2 process cleanly

### Requirement: Session persistence
The system SHALL persist aria2 task session data so unfinished downloads can be recovered after restart.

#### Scenario: Application restarts with unfinished tasks
- **WHEN** the application starts after a previous session with unfinished downloads
- **THEN** the system loads aria2 session data and reconciles recovered tasks with local task metadata

#### Scenario: Session save fails
- **WHEN** aria2 cannot save its session file
- **THEN** the system reports the failure and keeps the current in-memory task state visible to the user
