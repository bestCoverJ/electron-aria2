## Context

Tide X already has an Electron main process, secure preload bridge, React renderer, Tailwind/shadcn-style primitives, Lucide icons, local settings persistence, aria2 download services, and an initial dashboard. The current shell is still sized and composed like a large web app: the main window opens at `1280x800`, compact mode only swaps renderer content inside that same native frame, and the add-download dialog exposes raw implementation errors when the expected API shape is unavailable.

The updated UI direction is now fixed in `design-system/MASTER.md`: white main canvas, `#2f54eb` primary palette, compact utility window proportions, immersive left/top shell, three-pane workflow, and native directory selection with recent history.

## Goals / Non-Goals

**Goals:**

- Modernize the shell into a small desktop utility with a left menu, center download list, and right detail pane.
- Keep the visual system consistent with `design-system/MASTER.md`, including the blue palette and white content canvas.
- Use platform shell effects where Electron supports them: Windows Mica and macOS vibrancy/blur.
- Make compact mode an Electron window state that changes BrowserWindow size and frame behavior, not only renderer layout.
- Fix download creation error handling so missing/invalid preload API paths produce clear user-facing failures.
- Add native folder selection and persisted recent directories while preserving manual directory entry.

**Non-Goals:**

- Replacing aria2 or changing the download engine.
- Introducing a web landing page, marketing hero, or browser-style full-page dashboard.
- Adding cloud sync, browser extension capture, or remote aria2 server control.
- Changing package manager, downgrading electron-vite, or altering the secure preload boundary.

## Decisions

### Keep visual rules in `design-system/MASTER.md` before implementation

The UI redesign touches layout, color, window behavior, forms, and errors. The design system must remain the first source of truth so implementation does not drift into one-off component styling.

Alternatives considered:

- Patch styles directly in components: faster for a single screen, but weakens future consistency.
- Add page-only design notes: useful for narrow pages, but this change redefines shared shell behavior.

### Model full and compact as main-process window modes

The renderer should request `window.enterCompactMode` and `window.exitCompactMode` through preload IPC. The Electron main process owns BrowserWindow mutation: size, minimum size, resizability, frame state, background material, and restoring previous bounds. This keeps privileged window control out of the renderer and makes compact mode real.

Implementation shape:

- Add shared IPC channels and typed preload methods for window mode changes.
- Track the last full-window bounds before compacting.
- Enter compact mode by creating or reconfiguring a frameless compact BrowserWindow state. If the current Electron/platform cannot toggle `frame` on an existing window reliably, recreate the BrowserWindow and load the same renderer route/state.
- Exit compact mode by restoring saved bounds and native frame.
- Keep double-click restore in the renderer, but route the actual restore through main IPC.

Alternatives considered:

- CSS-only compact mode: already proven insufficient because the real OS window stays large.
- Renderer direct window calls: blocked by security constraints and inconsistent with the existing preload boundary.

### Use native shell effects only around navigation and chrome

The left menu and top title/toolbar get the immersive visual treatment. The center list and right details remain white or near-white with subtle borders so the app feels younger and lighter without sacrificing file/status readability.

Implementation shape:

- Keep Electron `backgroundMaterial: "mica"` on Windows where available.
- Keep macOS `vibrancy` and `visualEffectState` where available.
- Use CSS variables for the Ant Design-like blue palette from `#f0f5ff` through `#030852`.
- Avoid heavy blur behind dense task rows.

### Keep download intake behind a resilient preload API

The add-download flow should validate that `window.tide.downloads.add` exists before submitting. Main-process handlers should normalize thrown errors into stable messages. Renderer error UI should show action-oriented Chinese messages, never raw property-access text.

Implementation shape:

- Add a small renderer API guard/helper for optional preload paths.
- Ensure `useDownloads` initializes safe no-op/error states if preload is unavailable.
- Wrap `downloads.add` errors at the hook/dialog boundary.
- Add tests for the missing `downloads` path regression.

### Implement directory selection as native picker plus manual input plus history

Directory fields should behave like desktop controls. Clicking the browse affordance opens the native folder picker. Users can still type a path manually. Successful selections and submissions update a recent-directory list stored with settings.

Implementation shape:

- Add main IPC using Electron `dialog.showOpenDialog` with `openDirectory`.
- Expose `selectDirectory` through preload.
- Extend settings persistence with bounded recent directories, deduplicated by normalized path.
- Render directory input as text input plus folder button and recent-directory menu/list.

## Risks / Trade-offs

- [Electron cannot toggle native `frame` after BrowserWindow creation on all platforms] -> Implement compact mode through a main-process abstraction that can recreate the window if mutation is insufficient.
- [Mica/vibrancy availability differs by OS and Electron version] -> Treat platform effects as progressive enhancement and keep readable CSS fallback surfaces.
- [Directory history could store invalid or sensitive paths] -> Store only local paths the user typed or selected, cap the list, allow clearing through settings or future preferences, and never send paths outside local persistence.
- [Three-pane layout can become cramped at small widths] -> Collapse or hide the right detail pane before the primary download list becomes unusable.
- [Raw preload errors can still appear from unexpected code paths] -> Centralize renderer API guards and error normalization in `useDownloads`/intake helpers rather than only in dialog presentation.

## Migration Plan

1. Update shared design tokens and renderer layout to match `design-system/MASTER.md`.
2. Add typed IPC/preload APIs for window mode and directory selection.
3. Refactor compact mode to call main-process window mode APIs.
4. Replace save-directory fields with picker/manual/history controls.
5. Normalize download creation errors and add regression coverage.
6. Validate with `bun run typecheck` and existing verification scripts such as `verify:ui` and `verify:downloads` where applicable.

Rollback is straightforward because the change does not alter the aria2 runtime contract: keep old window creation defaults and renderer dashboard if the new shell is not ready, while preserving typed IPC additions behind unused methods.

## Open Questions

- Should compact mode always be frameless, or should Linux keep a framed fallback if frameless resize/drag behavior is inconsistent?
- Should recent directories be visible in both the add-download dialog and settings, or only in task creation for the first pass?
