## ADDED Requirements

### Requirement: Operational dashboard first screen
The system SHALL present the download manager dashboard as the first screen after application launch.

#### Scenario: User opens the app
- **WHEN** the main window loads
- **THEN** the system displays task filters, the primary task list, task creation controls, and current transfer summary without requiring navigation through a landing page

#### Scenario: No tasks exist
- **WHEN** the task list is empty
- **THEN** the system displays an empty state with a direct action to add a download task

### Requirement: shadcn/ui based interaction model
The system SHALL use shadcn/ui primitives and Lucide icons for core controls and feedback surfaces.

#### Scenario: User opens add-task dialog
- **WHEN** the user activates the add download action
- **THEN** the system displays a shadcn/ui dialog or sheet with labeled inputs, validation feedback, and keyboard-accessible actions

#### Scenario: User controls a task
- **WHEN** a task row exposes actions such as pause, resume, remove, reveal, or retry
- **THEN** the system represents actions with consistent Lucide icons, accessible labels, and visible hover/focus states

### Requirement: Professional visual system
The system SHALL follow the approved dashboard visual direction for Tide X.

#### Scenario: UI theme is rendered
- **WHEN** the renderer displays the main application UI
- **THEN** the system uses a flat productivity-dashboard style with teal primary color, orange high-emphasis action color, readable typography, and no emoji icons

#### Scenario: User switches theme
- **WHEN** light or dark mode is selected
- **THEN** the system preserves sufficient text contrast, visible borders, and focus indicators in the selected theme

### Requirement: Accessible task workflows
The system SHALL support keyboard and screen-reader accessible workflows for common task operations.

#### Scenario: Keyboard user navigates task list
- **WHEN** the user navigates the task list with a keyboard
- **THEN** focus order is predictable and each actionable control has a visible focus state and accessible name

#### Scenario: User prefers reduced motion
- **WHEN** the operating system requests reduced motion
- **THEN** the system disables or minimizes non-essential animations while preserving state feedback
