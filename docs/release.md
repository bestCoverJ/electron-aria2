# Tide X Release Notes

## Packaging Assets

Tide X packages aria2c as an explicit runtime asset. The packaged app expects:

- Windows x64: `resources/aria2/win32-x64/aria2c.exe`
- macOS arm64: `resources/aria2/darwin-arm64/aria2c`
- macOS x64: `resources/aria2/darwin-x64/aria2c`
- Linux x64: `resources/aria2/linux-x64/aria2c`

`electron-builder` copies `resources/aria2` into the application resources as
`aria2`. Runtime code resolves packaged binaries from
`process.resourcesPath/aria2/<platform>-<arch>/`.

## Verification Before Release

Run these checks before producing artifacts:

```bash
bun run typecheck
bun run lint
bun run verify:aria2
bun run verify:downloads
bun run verify:ui
bun run pack
```

For public release builds, run `bun run dist` on each target platform or in a
trusted CI matrix that provides the matching OS.

## Signing And Notarization

- Windows releases should be Authenticode-signed. Unsigned installers and
  embedded download binaries are more likely to trigger SmartScreen warnings.
- macOS releases should use a Developer ID certificate, hardened runtime, and
  notarization. The embedded `aria2c` executable must be included in the signed
  app bundle and remain executable after packaging.
- Linux AppImage and tarball artifacts should preserve executable bits for
  `aria2c`.

## Antivirus False Positives

Download managers and bundled network executables may trigger heuristic scans.
Keep a reproducible build record, publish checksums, avoid packing or obfuscating
the aria2 binary, and submit false-positive reports to major vendors when
needed.

## Updating aria2

- Track upstream aria2 security releases.
- Replace binaries per platform as a matched set.
- Re-run runtime and download-flow verification after every binary update.
- Keep third-party notices from aria2 distributions under `resources/aria2`.

## Current Constraint

The repository currently includes Windows x64 and Linux x64 aria2 assets. macOS
`darwin-arm64` and `darwin-x64` assets must be added before producing macOS
release artifacts.
