## ADDED Requirements

### Requirement: Recognize supported download sources

The system SHALL recognize HTTP/HTTPS, FTP/SFTP, Magnet, local torrent/Metalink, and remote torrent/Metalink sources and SHALL reject unsupported schemes before calling aria2.

#### Scenario: User adds an aria2 URI

- **WHEN** the user submits a valid HTTP, HTTPS, FTP, SFTP, or Magnet URI
- **THEN** the system creates an aria2 URI task with the configured directory and task options

#### Scenario: User selects local descriptor files

- **WHEN** the user selects one or more local `.torrent`, `.metalink`, or `.meta4` files
- **THEN** the system reads and submits every selected file through the matching aria2 RPC method

#### Scenario: User adds a remote descriptor

- **WHEN** a remote URI resolves to torrent or Metalink content by suffix or Content-Type
- **THEN** aria2 follows the descriptor in memory and Tide X displays the resulting content task instead of retaining the descriptor file task

#### Scenario: User adds ed2k or an unknown scheme

- **WHEN** the user submits an ed2k, thunderx, cloud-share, or unknown scheme
- **THEN** the system rejects that item with a concise protocol-specific error and does not call aria2 for it

### Requirement: Convert classic wrapped links offline

The system SHALL decode supported classic Thunder, FlashGet, and QQDL links locally and SHALL only submit decoded HTTP/HTTPS/FTP/SFTP URLs.

#### Scenario: User adds a valid classic wrapped link

- **WHEN** the wrapper and Base64 payload match the supported classic format and decode to a supported direct URL
- **THEN** the system submits the decoded URL to aria2 without contacting an external parsing service

#### Scenario: Wrapped payload is malformed

- **WHEN** Base64 decoding, wrapper validation, UTF-8 decoding, or decoded scheme validation fails
- **THEN** the system rejects only that item with a readable conversion error

### Requirement: Add mixed sources in batches

The system SHALL accept up to 100 non-empty mixed download sources per submission and SHALL return a result for each submitted source.

#### Scenario: Batch is partially valid

- **WHEN** some batch items are valid and others fail validation or task creation
- **THEN** valid tasks are created, failed items retain their individual errors, and failures do not roll back successful tasks

#### Scenario: Batch contains duplicates

- **WHEN** two items in the same submission normalize to the same source
- **THEN** the first item is processed and later duplicates are returned as skipped without calling aria2

#### Scenario: Batch exceeds the limit

- **WHEN** more than 100 non-empty sources are submitted
- **THEN** the system rejects the batch without creating any task

### Requirement: Preserve followed-task metadata

The system SHALL migrate persisted source metadata from remote descriptor parent tasks to every aria2 child task reported through `followedBy`.

#### Scenario: Remote descriptor creates child tasks

- **WHEN** aria2 reports one or more child GIDs for a followed descriptor task
- **THEN** each child receives retryable source metadata and the parent descriptor task is hidden from the projected task list

#### Scenario: User retries a followed child task

- **WHEN** the user retries a child created from a remote descriptor
- **THEN** Tide X resubmits the original remote descriptor source and follows the newly created task

### Requirement: Protect credentials in visible output

The system SHALL redact URL username and password values from task details, notifications, and logs while retaining the local source required for retry.

#### Scenario: Source contains URL credentials

- **WHEN** a supported URL includes username or password information
- **THEN** visible source text replaces the credentials and no log line contains their original values

### Requirement: Present actionable batch feedback

The add-download dialog SHALL support multiline mixed input and multi-file selection and SHALL retain only failed items after a partially successful submission.

#### Scenario: Some items fail

- **WHEN** the batch API returns created, failed, and skipped results
- **THEN** the dialog summarizes the counts, removes created and skipped lines, and shows the error beside each remaining failed source

#### Scenario: Custom file name is not applicable

- **WHEN** the input contains multiple sources or a Magnet, torrent, Metalink, or wrapped source
- **THEN** the custom file-name field is disabled and explains that naming is available only for one ordinary direct file URL

#### Scenario: Compact add dialog

- **WHEN** the add-download dialog opens in a 760×520 window without validation results
- **THEN** all primary fields and actions are visible without an outer dialog scrollbar and concise help remains associated with its field

#### Scenario: Add dialog backdrop remains visually continuous

- **WHEN** the add-download dialog is open
- **THEN** the backdrop dims the workspace without applying a blur filter to the underlying window content
