## ADDED Requirements

### Requirement: Robust download creation errors
The system SHALL normalize download creation failures into clear user-facing messages and MUST NOT display raw JavaScript property access errors.

#### Scenario: Preload downloads API is unavailable
- **WHEN** the user submits a new download and the renderer cannot access the expected downloads API
- **THEN** the UI displays a clear message that download services are unavailable and does not display `Cannot read properties of undefined (reading 'downloads')`.

#### Scenario: Aria2 rejects a task
- **WHEN** aria2 or the main-process download service rejects a submitted task
- **THEN** the UI displays a normalized failure message with enough context for the user to correct the source or retry.

#### Scenario: Submission succeeds
- **WHEN** the user submits a valid source and directory
- **THEN** the dialog closes and the task appears in the download list or the list refreshes from the download snapshot.

### Requirement: Native save-directory picker
The system SHALL open the operating system folder selection dialog when the user chooses to browse for a save directory.

#### Scenario: Browse for directory
- **WHEN** the user clicks the save-directory browse control
- **THEN** the system opens a native folder selection dialog configured for directories.

#### Scenario: Directory selected
- **WHEN** the user selects a folder in the native dialog
- **THEN** the selected path populates the save-directory input and becomes available for the pending download.

#### Scenario: Directory selection canceled
- **WHEN** the user cancels the native folder dialog
- **THEN** the previous save-directory input value remains unchanged.

### Requirement: Manual directory entry and history
The system SHALL allow manual directory entry and persist a bounded recent-directory history for reuse.

#### Scenario: Manual path entry
- **WHEN** the user types a directory path into the save-directory input
- **THEN** the typed value remains editable and can be submitted without forcing use of the native picker.

#### Scenario: Recent directory recorded
- **WHEN** the user successfully selects or submits a save directory
- **THEN** the directory is added to recent history, deduplicated, and stored in local settings.

#### Scenario: Recent directory reused
- **WHEN** recent directories exist
- **THEN** the user can choose one from the save-directory control and the input updates to that path.
