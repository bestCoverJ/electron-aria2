# Tide X Verification

## Automated Checks

```bash
bun run verify:aria2
bun run verify:downloads
bun run verify:ui
```

`verify:aria2` checks the current platform aria2c binary, verifies executable
permission where applicable, starts aria2 with local RPC, calls
`aria2.getVersion`, and shuts it down.

`verify:downloads` starts a local fixture HTTP server and a temporary aria2
runtime, then verifies add, pause, resume, remove, complete, fail, and restart
recovery behavior.

`verify:ui` checks renderer source contracts for the approved Tide X UI system:
React hooks, shadcn-style primitives, Lucide icons, split layout, compact mode,
accessible labels, visible focus hooks, light/dark theme definitions,
Source Han Sans typography, no horizontal-overflow shell constraints, and
reduced-motion support.

## Manual Desktop QA

- Add a direct HTTP/HTTPS task and verify progress, speed, remaining time, file
  size, and completed state.
- Add an invalid URL and verify validation feedback appears before aria2 is
  called.
- Add a Magnet or torrent task and verify metadata-discovery and file-list
  behavior.
- Pause and resume an active task from the row controls and tray menu.
- Remove a task with and without file deletion.
- Restart the app with an unfinished task and verify session recovery.
- Change download directory, limits, proxy, theme, and shutdown behavior, then
  restart and verify settings persist.
- Verify close-to-tray behavior while downloads are active and explicit quit
  behavior from the tray.
- Verify desktop notifications for completed and failed downloads.

## Manual UI QA

- Check desktop width around 1440px and 1024px.
- Check narrow width around 768px and 375px.
- Verify light and dark themes preserve text contrast and visible borders.
- Navigate sidebar, task rows, dialogs, and settings with keyboard only.
- Confirm no horizontal overflow appears in the main app shell.
- Confirm reduced-motion mode removes non-essential animation.
- Enter compact mode, verify current progress is visible, then double-click to
  restore the full dashboard.
