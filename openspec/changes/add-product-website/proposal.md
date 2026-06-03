## Why

Tide X has a working desktop downloader but no standalone product website to explain what it does, where to download it, what changed between versions, or what release constraints remain. A dedicated Astro static site under `website/` gives the project a public-facing surface that can present current capabilities honestly while staying separate from the Electron application.

## What Changes

- Add an independent Astro static website in `website/` for Tide X product communication.
- Create pages for the product introduction, downloads, changelog, and about/project principles.
- Present current implemented downloader capabilities: embedded aria2 runtime, multi-protocol task creation, queue controls, progress details, settings persistence, tray behavior, notifications, and release constraints.
- Provide structured download information by platform, version, artifact status, checksum fields, and known limitations such as missing macOS runtime assets before public macOS release.
- Use the provided `design-system/website/*.jpg` references to define a restrained editorial website style: large bold headings, generous whitespace, black text/buttons, numbered sections, image-led grids, and rounded visual media.
- Reuse existing Tide X brand and product assets where appropriate, including the logo and dashboard concept screenshots.
- Keep the website static and content-driven so it can be built, previewed, and deployed without coupling to Electron runtime code.

## Capabilities

### New Capabilities

- `product-website-content`: Product website pages, content model, download metadata, release notes, and about information for Tide X.
- `product-website-visual-experience`: Visual style, responsive layout, accessibility, and asset treatment for the standalone Tide X website.

### Modified Capabilities

- None.

## Impact

- Adds a new `website/` workspace area with Astro, TypeScript, static assets, and site-specific build scripts.
- May add package scripts for website development, build, and preview.
- Reuses existing assets from `resources/assets/icons/` and `design-system/assets/`; product-specific copies may live in `website/public/`.
- Does not change Electron main, preload, renderer, aria2 runtime behavior, packaging logic, or existing desktop app requirements.
