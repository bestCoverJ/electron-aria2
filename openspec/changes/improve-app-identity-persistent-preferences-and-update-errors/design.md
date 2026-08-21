## Context

应用同时存在 `Tide X`、`tide-x` 和 Electron 默认资源名；本地无签名打包为规避 winCodeSign 权限问题跳过了 EXE 资源编辑。设置已由 `AppStore` 持久化，可扩展为布局偏好的单一来源。当前 updater 将原始异常直接放入 IPC 快照。

## Goals / Non-Goals

**Goals:**

- 在窗口、安装包、EXE 资源、任务管理器和界面中统一为 TideX。
- 保持 `%APPDATA%/tide-x` 为稳定数据路径，避免改名导致历史丢失。
- 让目录历史可删除、侧边栏偏好可恢复。
- 将用户错误与诊断日志分离。

**Non-Goals:**

- 不增加应用内日志查看器，不上传日志。
- 不改变 appId 和已有安装身份。

## Decisions

1. 启动最早期先固定 `userData` 为旧 `tide-x` 目录，再设置 `app.setName("TideX")`；这同时获得新名称与旧数据兼容。
2. electron-builder 设置 `productName/executableName=TideX`。本地未签名包使用 `afterPack` + rcedit 修改 FileDescription/ProductName，避免依赖需符号链接权限的 winCodeSign 压缩包。
3. `sidebarCollapsed` 纳入 `AppSettings`；UI 乐观切换并立即调用 settings IPC。
4. 目录删除由共享 `DirectoryField` 的行内 Trash2 按钮完成，阻止菜单选中事件；默认目录保留但可删除其他项。
5. updater 将异常映射为 `UPD-001..005` 稳定错误码。原始错误追加到 `userData/logs/updater.log`，按 1 MiB 轮转一份；IPC 不携带原始异常。
6. 完成/失败通知使用 `gid + notificationGeneration` 去重。启动时将持久化的终态任务预置为已通知；用户重新下载时递增代次，避免旧完成任务重启重复通知，同时允许新一轮完成再次通知一次。
7. 将用户提供的 Noto Sans SC TTF 交给 Vite 随渲染资源打包，通过 `@font-face` 注册；`fontFamily` 纳入 `AppSettings`，根节点 CSS 变量负责全局应用，设置页提供带标签的输入、预览和恢复默认操作。
8. 本地打包继续绕开 winCodeSign，但 `afterPack` 使用 rcedit 的 `icon` 选项把 TideX ICO 写入最终 EXE；NSIS 显式复用同一 ICO，并固定快捷方式名称。

## Risks / Trade-offs

- [改名导致数据目录改变] → 在 `app.setName` 前显式固定旧 userData 路径。
- [本地 EXE 资源编辑与正式签名重叠] → afterPack 只负责品牌资源，签名仍由 electron-builder/CI 执行。
- [自定义字体在系统中不存在] → 设置页明确说明依赖系统安装，CSS 保留内置 Noto Sans SC 回退且提供即时预览。
- [日志可持续增长] → 有界轮转并不记录 token/请求头结构化字段。
