# Tide X Design System

> Source of truth for Tide X renderer UI. Page-specific overrides may live under
> `design-system/pages/`, but this file controls shared product rules.

## Product Surface

Tide X is a cross-platform desktop download manager. The first screen is the
operational dashboard, not a landing page. The interface language is Simplified
Chinese by default and must make active downloads, queue state, speed, task
actions, and settings immediately visible.

## Stack Rules

- Use React function components and hooks.
- Use shadcn/ui-style primitives for buttons, inputs, textarea, progress,
  badges, separators, switches, dialogs, and settings controls.
- Use Lucide icons for actions and status. Do not use emojis as UI icons.
- Keep privileged behavior behind preload IPC. Renderer code stays UI-only.

## Layout

- Tide X is a small desktop utility, not a web dashboard. The default window
  should feel compact and operational, with a target first-run size around
  `980x640`, a practical minimum around `760x520`, and no oversized hero or
  marketing-style empty space.
- Use a four-screen desktop workspace controlled by the left menu:
  - Download List: active and queued download tasks.
  - History: completed task records.
  - Trash: removed or failed task records that need cleanup or retry.
  - Settings: download engine, save folder, concurrent download, speed limit,
    appearance, and network controls.
- The persistent shell layout is:
  - Left: immersive menu with Download List, History, Trash, and Settings.
  - Center: the list or settings content for the selected menu item.
  - Right: selected task/file details only after a list item is selected. The
    panel is not reserved by default; the center list fills the available width
    and resets when the left menu changes.
  - Bottom: a status/task bar with overall progress, current speed, speed trend,
    and download engine connection state.
- Support a collapsed sidebar for dense desktop work.
- Support compact mode as an actual window mode, not just a smaller page layout:
  entering compact mode resizes the Electron BrowserWindow, removes the native
  frame, shows current progress and speed summary, and double-clicking restores
  the full framed dashboard. Compact mode controls should not duplicate engine
  status in the left menu.
- At narrow widths, hide secondary detail surfaces before introducing horizontal
  scrolling. The primary task list remains usable.

## Visual Direction

- Overall style: modern, young, concise desktop utility.
- Background: white `#ffffff` for the main content canvas.
- Primary color: blue `#2f54eb` for navigation selection, primary actions,
  progress, focus emphasis, and connected states.
- Primary palette:
  - `color-1`: `#f0f5ff`
  - `color-2`: `#d6e4ff`
  - `color-3`: `#adc6ff`
  - `color-4`: `#85a5ff`
  - `color-5`: `#597ef7`
  - `color-6`: `#2f54eb`
  - `color-7`: `#1d39c4`
  - `color-8`: `#10239e`
  - `color-9`: `#061178`
  - `color-10`: `#030852`
- Use glass/Mica for the shell:
  - The left menu and top title/toolbar areas should use platform immersion:
    Windows Mica where available and macOS vibrancy/blur where available.
  - Renderer surfaces can use translucent white panels, subtle borders, and
    backdrop blur only when text remains crisp.
  - Main content remains white and readable; do not wash the download list with
    heavy blur.
- Avoid decorative gradient blobs, marketing hero sections, nested cards, and
  hover states that move layout.

## Typography

- Default UI font: bundled Noto Sans SC Regular.
- Fallback stack:
  user-selected system font, `Noto Sans SC`, `Microsoft YaHei UI`,
  `PingFang SC`, system sans-serif.
- The appearance settings may override the body font by installed family name;
  code, hashes, and logs retain the monospace stack.
- Use normal letter spacing. Do not scale type with viewport width.
- Use compact headings inside dashboard panels; reserve large display type for
  actual hero surfaces, which Tide X does not use in the app shell.

## Accessibility

- Target WCAG AA contrast for all text and controls.
- Every interactive icon-only button needs an accessible label.
- Focus states must be visible in light and dark themes.
- Color must not be the only task-state indicator; pair it with labels.
- Form inputs require labels and validation feedback.
- Respect `prefers-reduced-motion` and remove non-essential animation.

## Component Rules

- Buttons: use icon buttons for common task actions; use icon+text only for
  clear commands such as add, settings, save, or reveal.
- Cards: use cards only for repeated task rows, modals, metrics, and detail
  groups. Do not put cards inside cards.
- Task rows: stable height behavior, no hover-induced layout shift, visible
  progress, speed, size, remaining time, and status label.
- History rows: stable list rows with completion state, size, and completion
  time where available.
- Trash rows: stable list rows with failed/removed state and recovery or cleanup
  actions where available.
- Settings: group basic download limits, proxy, appearance, advanced aria2
  options, and shutdown behavior with direct labels.
- Detail panel: selected downloads expose Overview, Files, Peers, and Log tabs.
  Do not auto-select the first row; no row selection means no details content.
- Status bar: show Download Engine only in the bottom bar, without secondary
  affordance icons. Speed trend visuals must be derived from active transfer
  speed and remain blank when there is no active download speed. Engine text
  must state success or failure, e.g. `引擎连接成功` or `引擎加载失败`.
- Empty/loading/unavailable/error states must include a direct next action when
  action is possible.
- Directory inputs: clicking the save-directory control opens the native folder
  picker through an icon button. The field must also allow manual typing and
  expose recent directory history through an editable dropdown for quick reuse.
- Download creation errors must be normalized into clear user-facing messages;
  raw JavaScript property access errors such as
  `Cannot read properties of undefined (reading 'downloads')` must never be
  shown in the UI.

## Verification Checklist

- Desktop and narrow widths have no horizontal overflow.
- Light theme preserves readable Mica/glass shell and white content surfaces.
- Download List, History, Trash, and Settings are reachable from the left menu
  without opening modal settings pages.
- The bottom status/task bar always shows overall progress, speed, speed trend,
  and engine connection state. The speed trend is blank when no task is moving.
- Sidebar does not duplicate bottom engine state, connection state, or compact
  controls.
- Compact mode changes the actual Electron window size/frame state, shows
  current progress, and restores the full framed dashboard on double-click.
- Focus rings are visible on sidebar items, task actions, dialogs, and settings.
- Reduced-motion mode disables or minimizes non-essential transitions.
