## Context

Tide X is a cross-platform desktop download manager built with Electron, React, shadcn-style UI, and an embedded aria2c runtime. The desktop product already has a compact blue-and-white utility design system, but it does not yet have a standalone website for public product introduction, downloads, release history, or project background.

The website should live in its own `website/` folder and use Astro as a static-site framework. It must not depend on Electron runtime code, aria2 process startup, or the renderer application bundle. The site should communicate real product capabilities from the current repository: embedded aria2 runtime, HTTP/HTTPS torrent Magnet and Metalink task creation, queue controls, task progress details, settings persistence, tray behavior, notifications, release checks, and platform packaging constraints.

The user-provided references in `design-system/website/1.jpg` through `5.jpg` establish the website art direction: white canvas, very large bold headings, relaxed editorial spacing, black primary buttons, numbered content sections, asymmetric media placement, and image grids with moderate rounded corners. Tide X should adapt that structure to a software product by using product screenshots, logo assets, and clean generated/abstract download visuals instead of unrelated lifestyle photography.

## Goals / Non-Goals

**Goals:**

- Add an Astro static site under `website/` with product introduction, download, changelog, and about pages.
- Make the site content-driven so feature lists, platform downloads, and release notes can be updated without editing layout components.
- Use a refined editorial visual style based on the reference images while preserving Tide X's product identity and trustworthy utility tone.
- Present download availability accurately by platform and version, including known release constraints.
- Reuse existing Tide X assets where practical and keep copied website assets under `website/public/`.
- Provide responsive layouts that remain polished on mobile, tablet, laptop, and wide desktop widths.
- Preserve accessibility basics: semantic landmarks, real headings, descriptive alt text, keyboard focus states, sufficient contrast, and reduced-motion support.

**Non-Goals:**

- Changing the Electron desktop app, aria2 runtime, IPC contracts, or packaging behavior.
- Adding a server-rendered backend, authentication, analytics, telemetry, CMS, or download API.
- Implementing browser extension capture, cloud sync, remote aria2 management, or any new product feature.
- Claiming macOS readiness before macOS aria2 assets, signing, and notarization work are complete.
- Building a generic marketing template that hides the actual product behind stock photography.

## Decisions

### Use Astro as an isolated static website workspace

The site will be created in `website/` with its own Astro configuration, TypeScript setup, public assets, and content/data files. This keeps the public site build independent from `electron-vite` and avoids coupling marketing pages to renderer-only APIs.

Alternatives considered:

- Add pages to the Electron renderer: not appropriate because the website must be deployable as static web output.
- Use a React SPA: unnecessary for mostly static pages and would add more client JavaScript than the site needs.
- Use plain HTML: possible, but Astro gives content collections, component reuse, asset organization, and static build ergonomics.

### Treat content as structured project data

Platform downloads, feature groups, release notes, and navigation labels should be stored in small TypeScript data modules and/or Astro content collections. The first release can use static placeholders for missing artifact URLs and checksum fields, but the page structure should already support real values.

Implementation shape:

- `src/data/downloads.ts` for platform cards, artifact status, version, architecture, links, checksums, file sizes, and caveats.
- `src/data/features.ts` for product capability groups.
- `src/content/releases/*.md` for changelog entries.
- Page components read from these sources rather than duplicating copy in multiple places.

Alternatives considered:

- Hard-code everything in page files: faster initially, but release updates and platform availability would drift.
- Read root `package.json` directly during site rendering: useful later, but not necessary for a first static site and can complicate workspace boundaries.

### Translate the reference style into a software-product editorial system

The visual system should preserve the references' strongest patterns:

- White page background with generous section padding.
- Large heavy headings with normal letter spacing.
- Muted gray body copy.
- Black filled primary buttons with rounded rectangular shape.
- Numbered feature blocks using `01`, `02`, `03` labels.
- Wide media bands and image grids with consistent gaps and 8-18px radii.
- Asymmetric hero compositions where text and media have distinct weight.

For Tide X, the media should show the actual product or product-adjacent visuals:

- Main hero: Tide X screenshot or concept screenshot in a clean framed image area.
- Feature grid: product screenshot crops, logo details, file-type visuals, or abstract network/download visuals if actual screenshots are unavailable.
- Download page: platform cards and release metadata rather than decorative imagery.

This reference style intentionally uses black primary CTAs; Tide X website can still use the desktop product blue as a small accent for links, focus rings, version badges, or product UI screenshot highlights.

Alternatives considered:

- Reuse the app's compact blue dashboard style directly: too operational for a public product website.
- Use colorful gradient SaaS hero styling: conflicts with the provided references and would feel generic.
- Use the reference images themselves as final product imagery: they are not product-relevant and would weaken trust.

### Structure the site around four public pages

The website should include:

- Home: product name, concise positioning, primary download CTA, product screenshot, numbered capability sections, workflow summary, and changelog/download teasers.
- Download: platform-specific download cards, artifact status, version, architecture, checksum fields, release caveats, and basic installation notes.
- Changelog: chronological release list sourced from content files, with sections for added, improved, fixed, and known limitations.
- About: product principles, local-first/download-engine ownership, aria2 attribution/third-party notices pointer, and scope boundaries.

Alternatives considered:

- Single long landing page: simpler, but download status and changelog deserve stable URLs.
- More pages such as docs, FAQ, or support: useful later, but outside the first site scope.

### Keep deployment and scripts conservative

The repository may add root scripts such as `website:dev`, `website:build`, and `website:preview`, but the website must also work from inside `website/` with normal package commands. Dependency installation should fit the repository's package manager choice during implementation.

The first proposal does not require a deployment provider. Generated static output can target common hosts such as GitHub Pages, Cloudflare Pages, Netlify, or any static file server.

## Risks / Trade-offs

- [Download links may not exist when the site ships] -> Represent each platform with explicit statuses such as available, preparing, or unsupported, and avoid enabling dead primary buttons.
- [Reference style can feel unrelated to a technical product] -> Use its layout grammar, not its subject matter; all final imagery should be Tide X screenshots, brand assets, or product-relevant abstract visuals.
- [Huge headings can overflow Chinese or narrow mobile screens] -> Define responsive heading sizes with fixed breakpoints, line-height constraints, and manual copy lengths; do not scale type directly with viewport width.
- [Astro introduces another workspace dependency set] -> Keep the website isolated and scripts explicit so desktop app build and verification remain unaffected.
- [Release facts can drift from package configuration] -> Store download metadata in a single data module and update it during release tasks.
- [macOS status could be misrepresented] -> Include a clear macOS constraint until `darwin-arm64` and `darwin-x64` aria2 assets plus signing/notarization are ready.
- [Images can harm performance] -> Use optimized dimensions, lazy loading below the fold, explicit width/height, and avoid shipping oversized reference images directly.

## Migration Plan

1. Scaffold the `website/` Astro project with TypeScript and a minimal component structure.
2. Copy or reference approved product assets into `website/public/` and document source asset paths.
3. Add structured content/data for navigation, features, downloads, and release notes.
4. Build the four pages and shared layout components.
5. Add site scripts and verify static build output.
6. Preview the site locally and verify desktop/mobile layouts against the reference-inspired design.

Rollback is simple because the website is additive. Removing or disabling `website/` scripts restores the repository to the previous desktop-app-only surface without changing application runtime behavior.

## Open Questions

- Should the public site language be Simplified Chinese only for the first release, or should it include an English route/content layer?
- What will be the canonical download host: GitHub Releases, project website static files, or another release distribution channel?
- Should final website imagery use current dashboard screenshots from the running app, the existing concept screenshots, or freshly exported marketing screenshots after implementation?
