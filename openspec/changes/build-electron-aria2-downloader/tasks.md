## 1. Project Foundation

- [x] 1.1 Initialize the electron-vite project structure with Electron main, preload, and React renderer entry points.
- [x] 1.2 Add and configure React, TypeScript, Tailwind CSS, shadcn/ui, and Lucide icon dependencies.
- [x] 1.3 Define path aliases, shared TypeScript types, lint/format scripts, and build scripts for the desktop app.
- [x] 1.4 Create the secure preload IPC surface for settings, runtime status, download operations, and task snapshots.

## 2. aria2 Runtime

- [x] 2.1 Add platform-specific aria2c runtime asset locations and startup-time binary resolution.
- [x] 2.2 Implement main-process aria2 daemon startup with localhost RPC binding, secret management, session file paths, and safe default options.
- [x] 2.3 Implement a typed aria2 JSON-RPC client in the main process.
- [x] 2.4 Add runtime health tracking for startup failure, unexpected exit, retry behavior, and clean shutdown.
- [x] 2.5 Implement aria2 session save/load and startup reconciliation hooks.

## 3. Local Persistence and Settings

- [x] 3.1 Implement local settings persistence for download directory, concurrency, connection count, speed limits, proxy, theme, and shutdown behavior.
- [x] 3.2 Implement local task metadata persistence for display name, history, user annotations, and file-retention choices.
- [x] 3.3 Apply settings changes to aria2 at runtime where supported.
- [x] 3.4 Add validation for paths, numeric limits, proxy values, and advanced aria2 options.

## 4. Download Task Management

- [x] 4.1 Implement task input parsing and validation for HTTP/HTTPS URLs, torrent files, Magnet links, and Metalink inputs.
- [x] 4.2 Implement add-task commands that map validated inputs to aria2 RPC calls with the current default settings.
- [x] 4.3 Implement pause, resume, remove, retry, and reveal-file/reveal-folder operations.
- [x] 4.4 Implement task state projection from aria2 status into `queued`, `active`, `paused`, `completed`, `failed`, `removed`, and `seeding`.
- [x] 4.5 Implement task snapshot polling or event refresh and normalize progress, speed, remaining time, file list, connections, and error details.
- [x] 4.6 Implement queue and speed-limit behavior using aria2 global and per-task options.

## 5. Renderer UI

- [x] 5.1 Build the main dashboard layout with task filters, transfer summary, primary task list, and task detail surface.
- [x] 5.2 Build the add-download dialog or sheet with labeled inputs, validation states, torrent file selection, and keyboard-accessible actions.
- [x] 5.3 Build task row controls using shadcn/ui components and Lucide icons for pause, resume, remove, retry, reveal, and details.
- [x] 5.4 Build empty, loading, runtime-unavailable, completed, failed, and metadata-discovery states.
- [x] 5.5 Build settings screens for downloads, limits, proxy, appearance, advanced aria2 options, and shutdown behavior.
- [x] 5.6 Apply the Tide X visual system: flat dashboard style, teal primary color, orange primary action color, Fira typography, visible focus states, and reduced-motion support.

## 6. Desktop Integration

- [ ] 6.1 Implement tray menu behavior for show, pause all, resume all, and quit.
- [ ] 6.2 Implement close-to-tray behavior when downloads are active and explicit quit behavior from menu or tray.
- [ ] 6.3 Implement desktop notifications for completed and failed downloads.
- [ ] 6.4 Implement open-file and reveal-in-folder behavior with platform-specific safeguards.

## 7. Packaging and Verification

- [ ] 7.1 Configure packaging to include aria2c binaries and runtime assets for Windows, macOS, and Linux.
- [ ] 7.2 Add startup smoke checks that verify the packaged aria2c binary exists, is executable, and can serve local RPC.
- [ ] 7.3 Verify application flows for add, pause, resume, remove, complete, fail, restart recovery, and settings persistence.
- [ ] 7.4 Verify UI at desktop and narrow responsive widths, including light/dark themes, focus states, no horizontal overflow, and reduced-motion behavior.
- [ ] 7.5 Document remaining release constraints for signing, notarization, antivirus false-positive handling, and platform-specific aria2 binary updates.
