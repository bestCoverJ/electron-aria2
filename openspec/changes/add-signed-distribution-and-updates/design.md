## Context

仓库已引入 electron-builder 并定义基础多平台产物，但 Windows 显式关闭了可执行文件签名，没有发布 CI，主进程也没有更新服务。应用使用严格的 context isolation 和类型化 preload API，更新操作必须继续遵守该信任边界。

## Goals / Non-Goals

**Goals:**

- 产出可由平台验证签名的 Windows 和 macOS 发布包，以及可安装的 Linux 产物。
- 通过 GitHub Releases 生成与 electron-updater 兼容的元数据和差分包。
- 将更新状态以单一服务管理，并以类型化 IPC 提供给关于页。
- 保证开发模式不访问发布网络，无凭据的本地构建仍可完成未签名打包。

**Non-Goals:**

- 不搭建自建更新服务器，不支持应用商店发布。
- 不在应用中管理、生成或存储签名私钥。
- 不强制静默安装；安装新版本必须由用户确认。

## Decisions

1. 使用 `electron-updater` 与 electron-builder GitHub provider。两者共享产物命名、`latest*.yml` 和 blockmap 协议，避免自定义版本解析和下载安全逻辑。备选的 generic provider 便于私有化，但当前没有已确定的发布域名。
2. 更新服务位于主进程，维护 `idle/checking/available/not-available/downloading/downloaded/error` 快照。preload 只暴露检查、下载、安装和订阅方法，不向渲染进程暴露 Electron 对象。
3. 更新采用用户可控流程：打包版延迟自动检查，发现版本后由用户触发下载，完成后由用户触发退出安装。这避免大文件在不知情时占用带宽。
4. 发布流程以 `v*` tag 触发 GitHub Actions matrix，平台分别签名并向同一 draft release 上传产物。Windows 读取 `CSC_LINK`/`CSC_KEY_PASSWORD`；macOS 额外读取 Apple ID/API 凭据完成 notarization。
5. 仓库不含任何证书或口令。CI 仅在 secrets 完整时执行正式签名；默认 `pack` 明确跳过 Windows EXE 编辑/签名并生成 NSIS/ZIP 本地测试产物，`pack:dir` 仅生成解包目录，`pack:signed` 和 `dist:publish` 保留正式签名。

## Risks / Trade-offs

- [GitHub 仓库迁移后更新源会变化] → 以 `package.json.repository` 作为 electron-builder 的单一可版本化发布地址，迁移时与 Git remote 一并修改。
- [Windows/macOS 签名与 Apple 公证无法在无证书环境完整验收] → CI 先做配置和构建检查，正式发布前用组织 secrets 进行一次 tag 演练并验证平台签名。
- [GitHub API 不可用时更新检查失败] → 错误只更新界面状态，不影响下载管理器主功能。
- [Linux AppImage 的自更新支持受运行环境影响] → 仅在 updater 报告可用时提供安装，同时保留 tar.gz 手动更新产物。

## Migration Plan

1. 合并更新服务、IPC/UI、builder 配置和 CI，日常开发流程不变。
2. 在 GitHub 配置 Windows 证书、Apple 签名/公证凭据和环境保护。
3. 提升 `package.json` 版本并创建与之一致的 `vX.Y.Z` tag，验证签名、release 附件和应用内升级。
4. 若发布失败，删除未公开的 draft release/tag，修正配置后用新补丁版本重发；已安装的旧版本不受影响。

## Open Questions

- 签名证书主体仍由发布维护者在 CI secrets 中确定，仓库不存储凭据。
