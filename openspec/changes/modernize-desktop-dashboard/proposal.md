## Why

The current Tide X interface still behaves like a large web dashboard: the shell is visually heavy, compact mode only shrinks content inside the existing window, and download creation exposes a raw JavaScript error when the preload/API path is unavailable. This change modernizes Tide X into a smaller, clearer desktop utility while fixing directory selection and task creation reliability.

## What Changes

- Replace the current large two-area dashboard with a compact three-pane workspace: left menu, center download list, and right selected file/task details.
- Update the shared UI rules before implementation in `design-system/MASTER.md`, including the `#2f54eb` primary palette, white content background, and platform immersive shell guidance.
- Apply Windows Mica and macOS vibrancy/glass behavior to the left menu and top title/toolbar areas while keeping list and detail content readable.
- Make compact mode an actual Electron window mode that resizes the BrowserWindow and uses a frameless window, then restores the full framed dashboard on double-click.
- Normalize download creation failures so the UI never displays raw errors such as `Cannot read properties of undefined (reading 'downloads')`.
- Replace plain save-directory typing with a native folder picker flow that still supports manual entry and persists recent directory history.
- Keep the stack on Bun, electron-vite 5, React, shadcn/ui-style primitives, Tailwind CSS, and Lucide icons.

## Capabilities

### New Capabilities

- `immersive-window-shell`: Platform-aware compact Electron shell, Mica/vibrancy title/menu areas, framed/full and frameless/compact window transitions.
- `three-pane-download-workspace`: Modernized renderer workspace with left navigation, center download list, right task/file details, white content surfaces, and `#2f54eb` visual system.
- `download-intake-and-directory-selection`: Robust download creation, native folder selection, manual directory input, recent directory history, and normalized error handling.

### Modified Capabilities

- None.

## Impact

- Updates `design-system/MASTER.md` as the implementation source of truth for UI color, layout, compact mode, and directory-picker behavior.
- Changes Electron main/preload IPC to support window mode transitions and native folder selection.
- Changes renderer layout, styles, task creation dialog, settings directory controls, and error presentation.
- May add small shared types/channels for window mode and directory history while preserving the existing secure preload boundary.
