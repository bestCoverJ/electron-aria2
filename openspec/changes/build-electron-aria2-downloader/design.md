## Context

Tide X is a new cross-platform desktop download manager. The product will use electron-vite for the desktop base, React for the renderer, shadcn/ui for the component system, and an embedded aria2c runtime for download execution.

The main architectural constraint is process separation. The renderer must remain a UI client. The Electron main process owns application lifecycle, local persistence, operating-system integration, aria2 process control, and JSON-RPC communication with aria2. The preload layer exposes a narrow typed IPC API to the renderer.

The UI direction follows the `ui-ux-pro-max` design-system guidance for a productivity dashboard: flat visual design, teal primary color, orange primary action color, Fira Sans/Fira Code typography, Lucide icons, visible focus states, and no decorative gradients or emoji icons.

## Goals / Non-Goals

**Goals:**

- Provide a stable desktop MVP for HTTP/HTTPS, torrent, Magnet, and Metalink downloads.
- Bundle aria2c per platform and start it automatically with secure local RPC settings.
- Keep aria2 runtime concerns out of the renderer process.
- Provide a desktop-first task dashboard with clear queue, progress, action, error, and settings states.
- Persist enough local state to recover active tasks and settings after restart.
- Package the app for Windows, macOS, and Linux with predictable binary inclusion.

**Non-Goals:**

- Browser extension download interception.
- Cloud sync or multi-device task synchronization.
- Video-site parsing through tools such as yt-dlp.
- Plugin system.
- Remote public aria2 server exposure.
- Mobile application builds.

## Decisions

### Use Electron + embedded aria2c as the product baseline

Electron provides mature cross-platform desktop APIs, a strong React ecosystem, and simpler shadcn/ui adoption. Embedded aria2c provides mature protocol support, segmented downloads, torrent handling, Magnet handling, Metalink support, speed limits, and session recovery without rebuilding download-engine behavior in Node.

Alternatives considered:

- Tauri + aria2c: lower memory and smaller bundles, but higher integration friction for a first desktop product using React/shadcn.
- Node-only download engine: simpler binary packaging, but weak BT/Magnet/Metalink support and much larger implementation risk.
- Remote-only aria2 UI: useful for advanced users, but does not satisfy the default ordinary-user experience.

### Treat Electron main as the only aria2 RPC owner

The main process starts aria2c, selects a local RPC port, generates or loads the RPC secret, and communicates with aria2 through JSON-RPC. The renderer uses preload-exposed IPC methods such as `downloads.add`, `downloads.pause`, `downloads.resume`, `downloads.remove`, `downloads.getSnapshot`, and `settings.update`.

This avoids exposing the RPC secret or aria2 endpoint to renderer code and gives the application one place to normalize aria2 errors.

### Store app metadata separately from aria2 session files

aria2 session files remain the source for recovering active aria2 tasks. Tide X stores user settings, task display metadata, task history, and UI preferences in a local application store. The implementation can start with a simple local JSON/electron-store style persistence layer and move to SQLite later if history filtering, indexing, or analytics become complex.

### Design the renderer as an operational dashboard

The first screen is the actual download manager, not a landing page. The layout uses a left navigation/sidebar for task filters, a primary task table/list, and a right-side or modal detail surface for selected task information.

UI implementation constraints:

- Use shadcn/ui primitives for buttons, dialogs, inputs, dropdowns, tabs, toasts, progress, table/list surfaces, and settings forms.
- Use Lucide icons for actions and status symbols.
- Keep cards to repeated task/detail surfaces only; avoid nested cards and marketing-style sections.
- Use teal as the primary navigation/status color and orange for high-emphasis creation actions.
- Respect keyboard navigation, visible focus states, reduced motion, and desktop responsive widths.

### Model task state as an application-level projection

aria2 exposes low-level task state. Tide X should project it into product states that the UI and tests can rely on:

- `queued`
- `active`
- `paused`
- `completed`
- `failed`
- `removed`
- `seeding`

The projection layer also normalizes speed, size, remaining time, file list, selected files, and last error details.

### Package aria2c as an explicit runtime asset

Each platform package includes the matching aria2c binary under a controlled runtime assets path. Startup validates the binary exists, is executable, and can start with the generated RPC configuration. Packaging scripts must ensure executable permissions on macOS/Linux and avoid relying on a system-installed aria2.

## Risks / Trade-offs

- [aria2 binary packaging differs by platform] -> Add packaging checks that verify binary presence, executable permissions, and startup smoke tests for Windows, macOS, and Linux artifacts.
- [aria2 RPC endpoint could be exposed insecurely] -> Bind to localhost by default, require an RPC secret, never expose the secret to renderer code, and avoid public remote-control features in MVP.
- [Renderer/main state can drift from aria2 state] -> Use periodic and event-driven task snapshots from main, treat aria2 as the source for active transfer state, and keep local metadata additive.
- [Session recovery can duplicate or lose tasks] -> Use aria2 `--save-session` and `--input-file`, reconcile recovered GIDs with local metadata on startup, and surface unrecoverable tasks as failed with a clear reason.
- [BT/Magnet downloads have legal and product-policy sensitivity] -> Keep product wording neutral, do not include copyrighted content sources, and avoid default trackers or discovery features that imply content sourcing.
- [Large task lists can hurt renderer performance] -> Use memoized derived state, stable row dimensions, and list virtualization if task counts grow beyond the MVP table size.
- [macOS signing/notarization can block embedded executables] -> Include packaging validation in release tasks and document notarization requirements before public distribution.
- [Advanced aria2 settings can overwhelm users] -> Split settings into basic and advanced groups, provide safe defaults, and keep dangerous/network-facing settings out of the default surface.

## Migration Plan

This is a new application, so no existing user data migration is required. Initial implementation should create the electron-vite app structure, add the managed aria2 runtime, then layer the renderer UI on top of stable IPC contracts.

Rollback strategy during development is to keep runtime integration behind main-process services and preserve the ability to run the renderer with mocked download snapshots until aria2 startup is stable on all target platforms.

## Open Questions

- What final product name should appear in the app chrome and package metadata: `Tide X`, another English name, or a Chinese name?
- Should task history use simple JSON persistence for MVP, or start with SQLite to support future search/filtering?
- Which package manager should be standard for this repository: npm, pnpm, yarn, or bun?
- What platforms must be release-tested before the first delivery: Windows only, or Windows/macOS/Linux from the start?
