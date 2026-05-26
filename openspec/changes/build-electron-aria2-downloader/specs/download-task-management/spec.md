## ADDED Requirements

### Requirement: Add download tasks
The system SHALL allow users to create download tasks from HTTP/HTTPS URLs, torrent files, Magnet links, and Metalink inputs.

#### Scenario: User adds a direct URL
- **WHEN** the user submits a valid HTTP or HTTPS URL
- **THEN** the system creates an aria2 download task using the configured default directory and shows it in the task list

#### Scenario: User adds a Magnet link
- **WHEN** the user submits a valid Magnet link
- **THEN** the system creates an aria2 task and shows metadata discovery progress until file information is available

#### Scenario: User adds invalid input
- **WHEN** the user submits an unsupported or malformed task input
- **THEN** the system rejects the task and displays a validation error without calling aria2

### Requirement: Control download tasks
The system SHALL allow users to pause, resume, remove, and retry tasks when those actions are valid for the task state.

#### Scenario: User pauses active task
- **WHEN** the user pauses an active task
- **THEN** the system sends the corresponding aria2 control request and updates the task state to paused after confirmation

#### Scenario: User resumes paused task
- **WHEN** the user resumes a paused task
- **THEN** the system sends the corresponding aria2 control request and returns the task to queued or active state

#### Scenario: User removes task
- **WHEN** the user removes a task
- **THEN** the system removes the task from active aria2 control and applies the user's selected file-retention behavior

### Requirement: Display task progress
The system SHALL show normalized task progress, speed, size, remaining time, connections, files, and error details.

#### Scenario: Task is downloading
- **WHEN** a task is active
- **THEN** the system displays percentage progress, downloaded size, total size when known, current speed, and estimated remaining time when calculable

#### Scenario: Task has multiple files
- **WHEN** a task includes multiple files
- **THEN** the system displays the file list and selected-file state available from aria2

#### Scenario: Task fails
- **WHEN** aria2 reports a task error
- **THEN** the system projects the task to failed state and displays a user-readable error reason

### Requirement: Enforce queue and speed settings
The system SHALL apply user-configured limits for concurrent downloads, per-task connections, and global or per-task speed.

#### Scenario: Concurrent limit is reached
- **WHEN** the number of active downloads reaches the configured maximum
- **THEN** additional tasks remain queued until an active slot becomes available

#### Scenario: User changes global speed limit
- **WHEN** the user updates the global download speed limit
- **THEN** the system applies the new limit to aria2 without requiring an application restart
