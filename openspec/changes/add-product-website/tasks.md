## 1. Website Foundation

- [x] 1.1 Create the standalone `website/` Astro project structure with TypeScript configuration, source pages, components, content/data folders, and public assets.
- [x] 1.2 Add website development, build, and preview scripts that do not interfere with the existing Electron app scripts.
- [x] 1.3 Configure shared site metadata, navigation, layout shell, header, footer, and semantic page structure.
- [x] 1.4 Add baseline CSS tokens for the reference-inspired white canvas, black text/buttons, muted body copy, Tide X blue accents, spacing scale, focus states, and responsive containers.

## 2. Content And Data Model

- [x] 2.1 Add structured navigation data and product metadata for Tide X name, positioning, version, repository links, and primary calls to action.
- [x] 2.2 Add feature data covering embedded aria2 runtime, supported input types, task controls, progress details, settings persistence, tray behavior, and notifications.
- [x] 2.3 Add platform download data for Windows, macOS, and Linux with version, architecture, package type, artifact status, download URL, checksum, file size, release date, and caveats.
- [x] 2.4 Add release/changelog content for the current `0.1.0` preview with added items and known limitations.
- [x] 2.5 Add about/principles content covering local-first behavior, managed aria2 runtime ownership, no public remote-control default, and third-party notice context.

## 3. Pages And Components

- [x] 3.1 Build the home page with Tide X hero, first-viewport product visual, primary download action, numbered capability sections, media grid, workflow summary, and changelog/download teasers.
- [x] 3.2 Build the download page with platform cards, accurate available/preparing states, disabled or secondary unavailable actions, and release caveat copy.
- [x] 3.3 Build the changelog page from structured release entries in reverse chronological order.
- [x] 3.4 Build the about page with product principles, scope boundaries, aria2 attribution context, and project links.
- [x] 3.5 Build reusable components for buttons, section headings, numbered feature blocks, media frames, download cards, changelog entries, and status badges.

## 4. Visual Assets And Reference Style

- [x] 4.1 Copy approved Tide X logo and product imagery into `website/public/` or document stable asset references used by the site.
- [x] 4.2 Use the existing dashboard concept screenshots or captured product screenshots for primary website imagery.
- [x] 4.3 Implement the reference-inspired layouts: large bold headings, generous whitespace, black primary buttons, numbered groups, asymmetric media, and rounded image grids.
- [x] 4.4 Ensure product imagery remains relevant to Tide X and does not use unrelated lifestyle or nature photos as final product visuals.
- [x] 4.5 Add explicit image dimensions, object-fit behavior, lazy loading for below-fold media, and descriptive alt text.

## 5. Responsive And Accessibility Verification

- [x] 5.1 Verify mobile, tablet, laptop, and wide desktop layouts for clean heading wraps, no horizontal overflow, stable image grids, and comfortable text line length.
- [x] 5.2 Verify keyboard navigation, visible focus states, semantic landmarks, meaningful headings, and descriptive links.
- [x] 5.3 Verify contrast for body text, muted text, buttons, links, badges, and focus rings against the white canvas.
- [x] 5.4 Verify reduced-motion behavior disables or minimizes non-essential transitions.
- [x] 5.5 Run the website build command and fix any Astro, TypeScript, asset, or content collection errors.

## 6. Documentation And Handoff

- [x] 6.1 Document how to run, build, and preview the website locally.
- [x] 6.2 Document where to update download metadata and release notes for future versions.
- [x] 6.3 Note unresolved publishing decisions such as canonical download host, macOS readiness, and language strategy.
