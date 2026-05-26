# Tide X

Tide X is a cross-platform desktop download manager built with Electron, React, shadcn/ui, and an embedded aria2c runtime.

## Development

```bash
bun install
bun run dev
```

## Verification

```bash
bun run typecheck
bun run lint
bun run verify:aria2
bun run verify:downloads
bun run verify:ui
```

## Packaging

```bash
bun run pack
bun run dist
```

See `docs/verification.md` for QA coverage and `docs/release.md` for signing,
notarization, antivirus, and aria2 binary update constraints.

## OpenSpec

The active implementation change is `build-electron-aria2-downloader`.
