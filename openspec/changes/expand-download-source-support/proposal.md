## Why

Tide X 当前的输入层只放行 HTTP/HTTPS、Magnet 和本地 torrent/Metalink，未开放 aria2 已具备的 FTP/SFTP，也无法直接处理远程描述文件、经典下载器包装链接或批量混合来源。用户需要在添加前手工转换和逐条提交，且不受支持的 ed2k 与现代迅雷链接缺少明确边界。

## What Changes

- 统一识别 HTTP/HTTPS、FTP/SFTP、Magnet、本地及远程 torrent/Metalink 下载来源。
- 离线解码经典 `thunder://`、`flashget://`、`qqdl://`，并将合法直链交给 aria2。
- 明确拒绝 ed2k、thunderx、迅雷云盘及未知协议，不引入第二下载引擎或外部解析服务。
- 支持单次最多 100 条混合链接及多选本地 torrent/Metalink 文件，按条创建并返回成功、失败、跳过结果。
- 远程 torrent/Metalink 在内存中跟随实际下载任务，并把来源元数据从描述文件父任务迁移到子任务。
- 对界面和日志中的带认证 URL 隐藏账号密码，同时保留本地重试所需来源。

## Capabilities

### New Capabilities

- `download-source-support`: 下载来源识别、经典包装链接转换、批量添加、远程描述文件跟随及安全来源展示。

### Modified Capabilities

无。

## Impact

- 扩展共享下载输入/结果类型、Electron IPC 与 preload API。
- 调整主进程来源解析、下载管理、aria2 任务投影和本地任务元数据迁移。
- 调整新建下载弹窗、文件选择和批量结果反馈。
- 扩充 UI 契约、解析器和 aria2 下载流程测试；不新增运行时下载引擎或外部服务依赖。
