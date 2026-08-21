## Why

Tide X 已能生成本地安装包，但缺少可验证的签名发布流程和应用内更新机制，用户无法稳定获取可信的新版本。需要将打包、签名、GitHub Releases 发布与客户端更新串成一条可重复的交付链路。

## What Changes

- 完善 electron-builder 的 Windows、macOS 和 Linux 分发配置及更新元数据生成。
- 增加 GitHub Actions 发布流程，根据 tag 构建并发布多平台产物。
- 通过 CI secrets/环境变量注入 Windows 代码签名证书和 Apple 签名/公证凭据，不将密钥纳入仓库。
- 在 Electron 主进程接入 electron-updater，仅在已打包应用中自动检查更新，并支持手动检查、下载和退出安装。
- 通过类型化 IPC/preload API 向渲染进程暴露更新状态和操作，并在“关于”页提供更新界面。

## Capabilities

### New Capabilities

- `signed-application-distribution`: 定义多平台分发产物、签名凭据边界和 GitHub Releases 发布行为。
- `in-app-application-updates`: 定义已打包应用的更新检查、下载、进度通知和安装行为。

### Modified Capabilities

## Impact

将影响 `package.json`、锁文件、Electron 主进程与 preload/IPC 合约、关于页 UI、验证脚本和 `.github/workflows` 发布流程；新增 `electron-updater` 运行时依赖。签名与实际发布依赖外部证书、Apple 开发者账号和 GitHub repository secrets。
