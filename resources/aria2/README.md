# aria2 runtime assets

Place platform-specific aria2c binaries in these directories:

- `win32-x64/aria2c.exe`
- `darwin-arm64/aria2c`
- `darwin-x64/aria2c`
- `linux-x64/aria2c`

The Electron main process resolves these paths at startup. Missing binaries are
reported as recoverable runtime errors in the UI.
