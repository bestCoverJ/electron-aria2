## ADDED Requirements

### Requirement: Standalone Astro website
The system SHALL provide a standalone Astro static website under `website/` for Tide X product information.

#### Scenario: Website workspace exists
- **WHEN** a developer opens the repository
- **THEN** the Tide X website source is contained under `website/` with its own Astro configuration, source pages, components, content or data files, and public assets.

#### Scenario: Website build is independent
- **WHEN** the website is built
- **THEN** the build does not require Electron, the renderer application, the preload bridge, or an aria2 runtime process to execute.

### Requirement: Product introduction page
The system SHALL provide a home page that introduces Tide X and its currently implemented downloader capabilities.

#### Scenario: Visitor opens the home page
- **WHEN** a visitor opens the website root page
- **THEN** the page presents the Tide X name, a concise product positioning statement, a primary download action, and a product screenshot or approved product visual in the first viewport.

#### Scenario: Visitor reviews product capabilities
- **WHEN** a visitor scrolls through the home page
- **THEN** the page explains embedded aria2 runtime management, HTTP/HTTPS torrent Magnet and Metalink task creation, pause/resume/remove/retry controls, progress details, queue and speed settings, persistence, tray behavior, and notifications.

#### Scenario: Product claims are constrained to implemented behavior
- **WHEN** the home page describes Tide X functionality
- **THEN** the page does not claim browser extension capture, cloud sync, remote public aria2 control, mobile apps, plugin support, or video-site parsing.

### Requirement: Download information page
The system SHALL provide a download page with structured platform release information.

#### Scenario: Visitor opens the download page
- **WHEN** a visitor opens the download page
- **THEN** the page lists platform download entries for Windows, macOS, and Linux with version, architecture, artifact status, package type, and download action or unavailable state.

#### Scenario: Platform artifact is available
- **WHEN** a platform download artifact is available
- **THEN** the page exposes a download link and supporting metadata fields for checksum, file size, and release date when those values are known.

#### Scenario: Platform artifact is not ready
- **WHEN** a platform download artifact is missing or blocked by release constraints
- **THEN** the page marks that platform as preparing or unavailable and explains the concrete limitation without showing a dead primary download button.

#### Scenario: macOS release is not ready
- **WHEN** macOS aria2 assets or signing/notarization requirements are not complete
- **THEN** the page clearly states that macOS release artifacts are not yet ready for public distribution.

### Requirement: Changelog page
The system SHALL provide a changelog page sourced from structured release entries.

#### Scenario: Visitor opens the changelog page
- **WHEN** a visitor opens the changelog page
- **THEN** the page displays releases in reverse chronological order with version, date, summary, and grouped changes.

#### Scenario: Release has known limitations
- **WHEN** a release entry includes known limitations
- **THEN** the changelog displays those limitations separately from added, improved, and fixed items.

#### Scenario: New release entry is added
- **WHEN** a developer adds a new release content file or release data entry
- **THEN** the changelog page includes the release without requiring layout code duplication.

### Requirement: About page
The system SHALL provide an about page that explains Tide X principles, project scope, and third-party runtime context.

#### Scenario: Visitor opens the about page
- **WHEN** a visitor opens the about page
- **THEN** the page explains Tide X as a local desktop download manager that uses an embedded aria2 runtime behind a managed desktop interface.

#### Scenario: Visitor reviews project boundaries
- **WHEN** a visitor reads the about page
- **THEN** the page communicates local-first operation, no public remote aria2 exposure by default, and no content discovery or copyrighted-source promotion.

#### Scenario: Third-party runtime context is shown
- **WHEN** the about page references aria2
- **THEN** the page points to bundled third-party notices or repository documentation for aria2 license and runtime update context.

### Requirement: Shared website content model
The system SHALL centralize navigation, feature, download, and release metadata so repeated page content stays consistent.

#### Scenario: Navigation is rendered
- **WHEN** the site header or footer is rendered
- **THEN** navigation labels and URLs come from a shared source or shared component rather than being independently duplicated across every page.

#### Scenario: Download metadata is updated
- **WHEN** a developer updates the version, artifact status, checksum, or download URL for a platform in the shared download data
- **THEN** all website surfaces that display that platform download information reflect the updated metadata.
