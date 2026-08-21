## ADDED Requirements

### Requirement: TideX 统一身份

系统 SHALL 将产品名、窗口标题、可执行文件名和 Windows 进程资源显示为 `TideX`，且 SHALL 保留现有 appId。

#### Scenario: Windows 打包后运行

- **WHEN** 用户启动打包后的 Windows 应用
- **THEN** 窗口和任务管理器使用 TideX 而非 Electron 或 Tide X

### Requirement: 改名不变更用户数据位置

系统 MUST 在改名后继续使用旧 `tide-x` 用户数据目录。

#### Scenario: 从旧版升级

- **WHEN** 用户安装 TideX 新版本
- **THEN** 旧设置、下载历史和 aria2 session 仍可读取
