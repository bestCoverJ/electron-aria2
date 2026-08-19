## 1. Source parsing and contracts

- [x] 1.1 Add shared source-kind, batch input/result, and multi-file picker contracts plus IPC/preload methods.
- [x] 1.2 Implement direct protocol recognition, classic Thunder/FlashGet/QQDL decoding, credential-safe display, and protocol-specific validation.
- [x] 1.3 Extend parsed task options for FTP/SFTP and remote torrent/Metalink in-memory following while preserving single-file naming rules.

## 2. Download management

- [x] 2.1 Implement ordered batch creation with the 100-item limit, same-batch canonical deduplication, and per-item results.
- [x] 2.2 Add aria2 followed-task fields and migrate metadata from remote descriptor parents to all child GIDs while suppressing parent tasks.
- [x] 2.3 Ensure logs, projected sources, retry, removal, and notifications use safe visible sources without losing retryable originals.

## 3. Renderer experience

- [x] 3.1 Upgrade task-file selection to multi-select and append selected descriptor paths to the source textarea.
- [x] 3.2 Implement multiline mixed-source submission, single-source naming eligibility, partial-success summary, and failed-line retention.
- [x] 3.3 Update supported-protocol guidance, empty states, About content, and unsupported-protocol explanations.
- [x] 3.4 Compact the add-download form, remove redundant help, and keep all primary controls visible without an outer scrollbar at 760×520.
- [x] 3.5 Disable backdrop blur specifically for the add-download dialog while retaining the dim overlay and reusable modal behavior.

## 4. Verification

- [x] 4.1 Add parser tests for direct protocols, classic wrappers, malformed inputs, ed2k, unknown schemes, redaction, and batch limits.
- [x] 4.2 Add batch, remote-follow metadata, retry, and aria2 flow tests including partial success and duplicate handling.
- [x] 4.3 Extend UI contracts and verify 760×520 light/dark rendering, keyboard behavior, typecheck, lint, aria2 smoke, download flows, and production build.
- [x] 4.4 Verify the compact dialog dimensions, source counting, naming eligibility, and absence of horizontal or outer-dialog overflow at 760×520.
- [x] 4.5 Verify the add-download backdrop has no blur filter while the dim overlay and dialog contrast remain intact.
