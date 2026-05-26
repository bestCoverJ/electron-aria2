## Why

Tide X will provide a cross-platform desktop download manager that gives ordinary users a stable local UI for aria2 without requiring them to install, configure, or operate aria2 manually. Electron + embedded aria2c gives the product mature download capabilities while keeping the first version focused on a reliable desktop workflow.

## What Changes

- Build a new desktop application based on electron-vite, React, and shadcn/ui.
- Bundle platform-specific aria2c binaries and manage the aria2 RPC daemon from the Electron main process.
- Add local download task creation, queue management, pause/resume/delete controls, progress tracking, and session recovery.
- Support HTTP/HTTPS, BitTorrent torrent files, Magnet links, and Metalink tasks through aria2.
- Add a desktop-first UI using shadcn/ui components, Lucide icons, accessible keyboard/focus behavior, and a restrained productivity-dashboard visual style.
- Add local settings for download directory, concurrent downloads, per-task connection limits, speed limits, proxy settings, and advanced aria2 options.
- Add system integration for tray behavior, desktop notifications, and safe application shutdown.

## Capabilities

### New Capabilities

- `desktop-app-shell`: Cross-platform Electron application shell, lifecycle, navigation, settings storage, tray behavior, and notification integration.
- `aria2-runtime`: Embedded aria2c distribution, daemon lifecycle management, JSON-RPC transport, security, and session persistence.
- `download-task-management`: User-facing download task creation, listing, control actions, progress state, queue behavior, and error handling.
- `download-user-experience`: React/shadcn UI structure, design-system constraints, accessibility behavior, and responsive desktop layout for the download manager.

### Modified Capabilities

- None.

## Impact

- New electron-vite application structure with Electron main, preload, and React renderer entry points.
- New runtime dependency on platform-specific aria2c binaries and aria2 JSON-RPC integration.
- New UI dependencies including React, shadcn/ui, Tailwind CSS, and Lucide icons.
- New local persistence for settings, task metadata, and aria2 session files.
- New packaging requirements for Windows, macOS, and Linux, including binary inclusion, executable permissions, signing/notarization considerations, and installer behavior.
