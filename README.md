# Electron Aria2

AI驱动的基于 Electron + React + TypeScript 的现代化 Aria2 下载管理器，支持 Windows 11 Mica 效果、深色/浅色主题自动切换、系统通知、剪切板智能识别下载链接、任务分类管理等。


## 近期主要变更

- ✨ **coverx:// 协议支持与自动解密**：支持 coverx 加密链接自动解密与下载，自动提取文件名。
- 🗃️ **下载任务持久化**：关闭程序后，已删除任务等历史记录会自动保存并恢复。
- 🛡️ **重复任务智能提示**：添加相同下载链接时会弹窗询问是否继续添加，避免误操作。
- 🖼️ **Sidebar底部图标修正**：Powered by 图标请放置于 `public/assets/icons/` 目录，代码已适配 `/assets/icons/aria2.png` 和 `/assets/icons/electron.png` 路径。
- 🖌️ **新建任务弹窗遮罩优化**：遮罩层更轻柔，提升视觉体验。
- 🧩 **剪贴板检测优化**：避免重复弹窗和重复任务。
- 🐞 **多项UI与交互细节修复**：如错误任务高亮、进度条一致性、按钮可见性等。

## 功能特性

- ⚡ **Aria2 高级下载管理**：集成 Maria2，支持多协议下载、断点续传、批量任务。
- 🎨 **现代 UI/UX**：采用 Tailwind CSS 4、HeadlessUI、Lucide 图标，支持 Windows 11 Mica/Acrylic 效果。
- 🌗 **自动主题切换**：根据系统深浅色自动切换，所有区域均为半透明渐变背景。
- 🖥️ **自定义标题栏**：自带窗口控制按钮，风格与系统一致。
- 🗂️ **任务分类**：支持全部、下载中、已暂停、已完成、已删除分类，错误任务归入已完成并可一键重新下载。
- 🗑️ **回收站管理**：删除任务后可在“已删除”分类中查看。
- 🔔 **系统通知**：下载完成自动弹出系统通知，点击可打开文件所在目录。
- 📋 **剪切板智能识别**：启动时自动检测剪切板下载链接，支持50+常见文件类型和磁力链接。
- 📁 **路径记忆**：新建任务时自动记忆上次保存路径。
- 📝 **自动文件名提取**：输入下载链接自动提取文件名。
- 🔄 **刷新与实时同步**：一键刷新所有任务，状态实时同步。

## 目录结构

```
├── build/                # 应用图标、entitlements等
├── resources/            # 静态资源
├── src/
│   ├── main/             # Electron 主进程，Aria2集成、窗口管理、IPC
│   ├── preload/          # 预加载脚本，暴露安全API
│   └── renderer/
│       ├── src/
│       │   ├── App.tsx           # 主界面
│       │   ├── components/       # 组件（TitleBar, DownloadItem, AddDownloadModal等）
│       │   └── assets/           # 样式与图片
│       └── index.html
├── electron.vite.config.ts       # Electron Vite 配置
├── tailwind.config.js            # Tailwind 配置
├── package.json                  # 项目依赖与脚本
└── README.md
```

## 本地开发与调试

1. **安装依赖**
   ```bash
   pnpm install
   # 或 npm install
   ```
2. **开发模式启动**
   ```bash
   npm run dev
   # 或 pnpm dev
   ```
   - 启动后会自动打开 Electron 应用窗口。
   - 支持热重载，修改前端/主进程代码自动刷新。

3. **打包构建**
   ```bash
   npm run build:win   # Windows
   npm run build:mac   # macOS
   npm run build:linux # Linux
   ```

4. **代码检查与格式化**
   ```bash
   npm run lint
   npm run format
   npm run typecheck
   ```

## 未来计划与未启用功能

- [ ] **多 Aria2 实例/远程管理**：支持添加/切换多个 Aria2 RPC 节点。
- [ ] **任务导入导出**：批量导入导出下载任务、历史记录。
- [ ] **下载限速/调度**：支持全局/单任务限速、定时下载。
- [ ] **BT/磁力任务文件预览**：支持种子文件内容预览、文件选择。
- [ ] **系统托盘与最小化到托盘**：后台静默下载，托盘菜单快捷操作。
- [ ] **多语言支持**：国际化，支持中英文切换。
- [ ] **自动更新**：集成 electron-updater 实现一键升级。
- [ ] **更多通知自定义**：支持下载失败、暂停等多种系统通知。
- [ ] **移动端适配**：未来考虑支持移动端 Web 控制。

---

如需反馈或贡献，欢迎提交 Issue 或 PR！
