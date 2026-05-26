# Tide X Design System

> Source of truth for Tide X renderer UI. Page-specific overrides may live under
> `design-system/pages/`, but this file controls shared product rules.

## Product Surface

Tide X is a cross-platform desktop download manager. The first screen is the
operational dashboard, not a landing page. The interface must make active
downloads, queue state, speed, task actions, and settings immediately visible.

## Stack Rules

- Use React function components and hooks.
- Use shadcn/ui-style primitives for buttons, inputs, textarea, progress,
  badges, separators, switches, dialogs, and settings controls.
- Use Lucide icons for actions and status. Do not use emojis as UI icons.
- Keep privileged behavior behind preload IPC. Renderer code stays UI-only.

## Layout

- Use a left/right desktop split:
  - Left: functional menu and task filters.
  - Right: transfer summary, task list, and task detail surface.
- Support a collapsed sidebar for dense desktop work.
- Support compact mode showing current download progress and speed summary.
  Double-clicking compact mode restores the full dashboard.
- At narrow widths, hide secondary detail surfaces before introducing horizontal
  scrolling. The primary task list remains usable.

## Visual Direction

- Overall style: simple, modern, restrained productivity dashboard.
- Primary color: teal `#0d9488` for navigation, connected state, and progress.
- High-emphasis action color: orange `#f97316` for creation and destructive
  attention when appropriate.
- Use glass/Mica carefully:
  - Windows may use Mica via the Electron window background.
  - macOS may use vibrancy/blur through the shell.
  - Content panels must stay readable with opaque-enough surfaces, visible
    borders, and high-contrast text.
- Avoid decorative gradient blobs, marketing hero sections, nested cards, and
  hover states that move layout.

## Typography

- Default UI font: Source Han Sans / Noto Sans CJK / 思源黑体 family.
- Fallback stack:
  `Source Han Sans SC`, `Noto Sans CJK SC`, `Microsoft YaHei`, `PingFang SC`,
  `Inter`, system sans-serif.
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
- Settings: group basic download limits, proxy, appearance, advanced aria2
  options, and shutdown behavior with direct labels.
- Empty/loading/unavailable/error states must include a direct next action when
  action is possible.

## Verification Checklist

- Desktop and narrow widths have no horizontal overflow.
- Light and dark themes preserve readable glass panels.
- Sidebar collapse and compact mode work with keyboard-accessible controls.
- Compact mode shows current progress and restores on double-click.
- Focus rings are visible on sidebar items, task actions, dialogs, and settings.
- Reduced-motion mode disables or minimizes non-essential transitions.
