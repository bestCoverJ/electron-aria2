## Why

Tide X 的产品名、Windows 进程资源和用户可见文案不一致，部分布局/目录偏好无法长期保留，更新失败还会暴露大段底层网络信息。需要统一 TideX 身份，完善可管理偏好，并将详细错误转移到持久化日志。

## What Changes

- 将用户可见产品名、可执行文件名和 Windows 版本资源统一为 `TideX`，同时保留旧用户数据目录以避免数据迁移丢失。
- 为最近保存目录增加单项删除操作，且当前默认目录不会被误删。
- 将主界面侧边栏折叠状态纳入 `AppSettings` 并随设置恢复。
- 更新失败时只展示稳定错误码和简短建议，完整异常写入用户数据下的轮转日志文件。

## Capabilities

### New Capabilities

- `consistent-application-identity`: TideX 产品名、进程资源及数据目录兼容性。
- `persistent-workspace-preferences`: 目录历史删除与侧边栏折叠状态持久化。
- `safe-update-error-reporting`: 更新错误码、用户提示与本地详细日志。

### Modified Capabilities

## Impact

影响 electron-builder 配置/构建钩子、主进程应用初始化、所有 TideX 品牌文案、`AppSettings`、目录选择组件、侧边栏状态、更新服务及验证脚本。
