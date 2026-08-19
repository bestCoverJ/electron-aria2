## Context

Tide X 以 Electron 主进程管理内置 aria2 RPC，renderer 通过 preload/IPC 添加任务。当前 `parseDownloadInput` 同时承担校验与 aria2 参数生成，但仅识别少量来源；单任务 API 只返回一个 GID，任务元数据按 GID 持久化。aria2 1.37.0 已启用 BitTorrent、Metalink、FTP 与 SFTP，并支持 `follow-torrent`/`follow-metalink`。

## Goals / Non-Goals

**Goals:**

- 以单一解析结果描述原始来源、规范来源、安全展示来源、来源类型和 aria2 参数。
- 保持单任务 API 兼容，同时支持最多 100 条混合来源的部分成功批量创建。
- 使用 aria2 内存跟随远程 torrent/Metalink，并维持任务来源、日志和重试能力。
- 不在界面和日志中泄露 URL 用户名或密码。

**Non-Goals:**

- 不支持 ed2k、thunderx、迅雷云盘或需要账户/外部服务的解析。
- 不引入 aMule、MLDonkey 或其他下载引擎。
- 不跨提交历史自动去重，也不提供远程描述文件本体保存模式。

## Decisions

1. **解析与入队分离。** `normalizeDownloadSource` 先执行协议识别和经典包装链接离线解码，`parseDownloadInput` 再生成本地文件内容或 aria2 参数。这样 UI 校验、批量去重和主进程执行共享同一规范化规则，不复制正则。
2. **经典链接只解码一层。** Thunder 仅接受 Base64 解码后的 `AA<URL>ZZ`，FlashGet 接受 payload 前段并要求 `[FLASHGET]<URL>[FLASHGET]`，QQDL 接受完整 Base64 URL；同时兼容标准和 URL-safe Base64。解码结果必须为 HTTP/HTTPS/FTP/SFTP，禁止递归包装。
3. **批量 API 保留逐条结果。** 新增 `addBatch`，依输入顺序串行执行；空行由 UI/主进程忽略，规范来源在同批重复时返回 `skipped`，其他项分别返回 `created` 或 `failed`。单次超过 100 条时整体拒绝，避免无界 RPC 请求。
4. **远程描述文件交由 aria2 跟随。** URI 任务显式设置 `follow-torrent=mem`、`follow-metalink=mem`。快照阶段读取 `followedBy`，将父 GID 元数据复制到所有子 GID、移除父元数据并从 UI 快照隐藏父任务；子任务继续保存原始远程来源以支持重试。
5. **原始来源与安全展示分开。** 元数据保留原始来源；任务投影和日志使用移除 URL 用户名/密码后的 `displaySource`。经典包装链接显示其协议和脱敏后的解析目标，不回显认证信息。
6. **批量 UI 复用现有弹窗。** 来源 textarea 每行一条；文件选择器允许多选并追加绝对路径。单条普通直链时显示自定义文件名，批量、Magnet、torrent、Metalink 或包装链接时禁用并解释原因。失败后只保留失败项和逐条错误，全部成功时关闭弹窗。
7. **紧凑视口不滚动。** 新建下载弹窗只保留来源、文件名和目录三个主字段，把协议说明、数量和命名条件压缩到对应标签附近；默认状态在 760×520 视口内完整展示，外层弹窗不出现滚动条，超长来源仍由 textarea 自身承载。
8. **新建弹窗保持背景连续。** 通用弹窗保留可配置的背景模糊能力，但新建下载弹窗只使用半透明暗色遮罩，不应用 backdrop blur，避免主窗口内容被模糊后产生视觉割裂。

## Risks / Trade-offs

- **远程描述文件会产生父子 GID 切换** → 在每次快照前迁移元数据，并用契约测试覆盖一个父任务对应多个子任务。
- **远程服务器可能以 Content-Type 返回描述文件，即使 URL 无扩展名** → 对所有支持的直接 URI 启用内存跟随，并将该行为写入产品说明。
- **经典链接格式存在非标准变体** → 严格接受已定义包装格式；无法安全还原时逐条报错，不猜测或调用外部服务。
- **FTP/SFTP 集成测试环境差异** → 解析器和 RPC 参数使用自动测试覆盖，发行前保留各平台真实服务器验收项。
- **本地状态仍需保存重试来源** → 只在本地状态保存原始值，所有可见输出均脱敏；本期不扩展凭据管理。

## Migration Plan

新增字段均采用可选值并在读取旧元数据时回退，现有单任务 `add` 与任务状态结构保持兼容。若上线后出现父子任务迁移问题，可关闭远程跟随相关参数而不影响本地 torrent、Magnet 和普通 URI。

## Open Questions

无。
