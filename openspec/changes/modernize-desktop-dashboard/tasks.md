## 1. Design System And Tokens

- [x] 1.1 Update renderer CSS variables and Tailwind usage to use the `#2f54eb` primary palette and white main content canvas from `design-system/MASTER.md`.
- [x] 1.2 Replace old teal/orange emphasis in shared UI components and dashboard surfaces with approved blue tokens and neutral/destructive tokens.
- [x] 1.3 Audit renderer text, spacing, and panel styling so the full dashboard reads as a compact utility rather than a large web page.

## 2. Immersive Window Shell

- [x] 2.1 Change full-window defaults to compact utility bounds and practical minimum bounds while preserving cross-platform startup behavior.
- [x] 2.2 Add typed shared IPC channels, preload methods, and main-process handlers for entering and exiting compact window mode.
- [x] 2.3 Implement full-to-compact transition that stores previous bounds, resizes to compact bounds, and uses frameless compact behavior or a recreate-window fallback when required.
- [x] 2.4 Implement compact-to-full restore on double-click through main-process IPC and restore the framed full dashboard bounds.
- [x] 2.5 Apply Mica/vibrancy/fallback styling to left menu and top title/toolbar areas while keeping the center and right panes readable.

## 3. Three-Pane Dashboard

- [x] 3.1 Refactor `App.tsx` into left navigation, center download list, and right task/file details components with stable responsive behavior.
- [x] 3.2 Update task rows to provide compact accessible icon actions for pause, resume, retry, reveal, and delete without hover-driven layout shift.
- [x] 3.3 Update the detail pane to show selected task progress, speed, size, connections, files, and failure information with a sensible default selection.
- [x] 3.4 Replace oversized or nested card layouts with concise white surfaces and subtle separators that match `design-system/MASTER.md`.
- [x] 3.5 Ensure narrow widths collapse or hide the right detail pane before the download list overflows horizontally.

## 4. Download Intake And Directory Selection

- [x] 4.1 Add typed preload/main IPC for native save-directory selection using Electron `dialog.showOpenDialog` with directory selection.
- [x] 4.2 Extend settings persistence and shared types with bounded, deduplicated recent save-directory history.
- [x] 4.3 Replace add-download and settings directory fields with a control that supports manual typing, browse button, and recent-directory reuse.
- [x] 4.4 Normalize missing preload/download API and aria2 rejection errors so raw property-access messages are never shown to users.
- [x] 4.5 Confirm successful download submission closes the dialog and refreshes or reflects the task snapshot.

## 5. Verification

- [x] 5.1 Add or update focused unit/contract coverage for preload API guards, directory history normalization, and missing `downloads` regression handling.
- [x] 5.2 Run `bun run typecheck`.
- [x] 5.3 Run `bun run verify:ui` and `bun run verify:downloads` if the local runtime prerequisites are available.
- [ ] 5.4 Manually verify full dashboard, compact mode, restore behavior, directory picker, manual directory entry, and recent-directory reuse on the local platform.
