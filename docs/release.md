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

```powershell
pnpm run typecheck
pnpm run lint
pnpm run verify:aria2
pnpm run verify:downloads
pnpm run verify:ui
pnpm run verify:release
pnpm run pack:unsigned
```

For public releases, update `package.json` first and push a matching tag such as
`v0.2.0`. `.github/workflows/main.yml` verifies that the tag and package version
match, then builds each artifact on its native operating system and publishes a
single draft GitHub Release. The updater reads the generated `latest*.yml` files.

## Signing And Notarization

- Windows CI reads the base64-encoded certificate or certificate URL from
  `WINDOWS_CSC_LINK` and its password from `WINDOWS_CSC_KEY_PASSWORD`. These are
  passed to electron-builder as `CSC_LINK` and `CSC_KEY_PASSWORD`.
- macOS CI reads the Developer ID certificate and password from
  `MACOS_CSC_LINK`/`MACOS_CSC_KEY_PASSWORD` and passes them as `CSC_LINK`/
  `CSC_KEY_PASSWORD`; notarization credentials come from
  and notarization credentials from `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`,
  and `APPLE_TEAM_ID`. The embedded `aria2c` executable is included in the signed
  app bundle and must remain executable after packaging.
- Linux AppImage and tarball artifacts should preserve executable bits for
  `aria2c`.

Never commit certificates, private keys, passwords, or local `.env` files. Use
`pnpm run pack:unsigned` for an unsigned local Windows package. It explicitly
skips executable signing/editing so it also works without Windows Developer
Mode's symbolic-link permission. Such output is only for testing and is not
suitable for public distribution. `pnpm run pack` and `pnpm run dist:publish`
retain executable editing and signing.

## In-app Updates

Only packaged builds contact GitHub Releases. Ten seconds after startup the app
checks for an update without downloading it. The About page can check again,
start the download, show progress, and restart to install after download. A
network or update error does not stop aria2 or other application features.

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
