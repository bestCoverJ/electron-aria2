# aria2 runtime assets

Place platform-specific aria2c binaries in these directories:

- `win32-x64/aria2c.exe`
- `darwin-arm64/aria2c`
- `darwin-x64/aria2c`
- `linux-x64/aria2c`

Packaging copies this directory to the app resource path as `aria2`. Runtime
resolution uses `process.resourcesPath/aria2/<platform>-<arch>/aria2c` in
packaged builds and `resources/aria2/<platform>-<arch>/aria2c` in development.

Run `bun run verify:aria2` after adding or replacing a platform binary. Run
`bun run verify:downloads` on each release OS to confirm local RPC and core
download flows.

The Electron main process resolves these paths at startup. Missing binaries are
reported as recoverable runtime errors in the UI.
