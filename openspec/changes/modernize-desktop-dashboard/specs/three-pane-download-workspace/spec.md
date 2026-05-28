## ADDED Requirements

### Requirement: Three-pane download workspace
The system SHALL present the primary dashboard as a three-pane workspace with left navigation, center download list, and right selected task/file details.

#### Scenario: Dashboard panes are visible
- **WHEN** the full dashboard has enough width
- **THEN** the left menu, center download list, and right details pane are visible in a single application window.

#### Scenario: Task selection updates details
- **WHEN** the user selects a task in the center download list
- **THEN** the right pane displays the selected task name, state, progress, speed, size, connection count, file list, and any failure message.

#### Scenario: No task selected
- **WHEN** no task is selected and tasks exist
- **THEN** the dashboard selects or previews a sensible default task without showing an empty broken details pane.

### Requirement: Blue and white visual system
The system SHALL use the design-system blue palette with `#2f54eb` as primary and white as the main content background.

#### Scenario: Primary action color
- **WHEN** the user views primary actions, selected navigation items, progress emphasis, or focus emphasis
- **THEN** those elements use the `#2f54eb` primary system or an approved token derived from the design-system palette.

#### Scenario: Main content background
- **WHEN** the user views the download list and task details
- **THEN** the main content surfaces use white or near-white backgrounds with subtle borders and readable text.

### Requirement: Simplified utility interactions
The system SHALL keep task operations compact, icon-led, and stable without web-page hero sections or oversized empty layouts.

#### Scenario: Task row actions
- **WHEN** a task row is displayed
- **THEN** common actions such as pause, resume, retry, reveal, and delete are available as accessible icon buttons without changing row height on hover.

#### Scenario: Empty state
- **WHEN** there are no download tasks
- **THEN** the dashboard shows a concise empty state with a direct new-download action and no marketing-style hero section.

#### Scenario: Keyboard focus
- **WHEN** the user tabs through menu items, task actions, dialogs, and settings controls
- **THEN** each interactive element exposes a visible focus state that remains readable on the white and immersive surfaces.
