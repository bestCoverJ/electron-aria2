# Tide X Website

Astro static product website for Tide X.

## Commands

```bash
pnpm install
pnpm run dev
pnpm run build
pnpm run preview
```

From the repository root:

```bash
pnpm run website:dev
pnpm run website:build
pnpm run website:preview
```

## Updating Content

- Navigation and product metadata: `src/data/site.ts`
- Feature copy: `src/data/features.ts`
- Platform download metadata: `src/data/downloads.ts`
- Release notes: `src/content/releases/*.md`
- Global Less + Tailwind styles: `src/styles/global.less`

## Styling

The website uses Astro with Less and Tailwind CSS. Shared editorial styling lives in
`src/styles/global.less`; Tailwind utilities are available in Astro templates and
inside Less through `@apply` where it keeps repeated utility groups readable.

## Publishing Notes

- Canonical download hosting is still undecided. The download data currently uses placeholder anchors for artifacts that need real release URLs.
- macOS public artifacts remain blocked until darwin aria2 assets, Developer ID signing, and notarization are complete.
- The first website release is Simplified Chinese only; an English content layer can be added later if needed.
