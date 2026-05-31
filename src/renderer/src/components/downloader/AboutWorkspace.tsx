import { ExternalLink, PackageCheck, ShieldCheck } from "lucide-react";
import type { ReactElement } from "react";
import appIconUrl from "../../../../../resources/assets/icons/tide-logo.png?url";

const appVersion = "0.1.0";

const openSourceItems = [
  {
    name: "aria2",
    license: "GPL-2.0",
    usage: "下载引擎，负责 HTTP、FTP、BitTorrent、Metalink 等任务传输。",
  },
  {
    name: "Electron",
    license: "MIT",
    usage: "桌面应用运行时。",
  },
  {
    name: "React",
    license: "MIT",
    usage: "用户界面构建。",
  },
  {
    name: "Radix UI",
    license: "MIT",
    usage: "基础交互组件。",
  },
  {
    name: "lucide-react",
    license: "ISC",
    usage: "界面图标。",
  },
  {
    name: "Tailwind CSS",
    license: "MIT",
    usage: "界面样式系统。",
  },
  {
    name: "Vite / TypeScript",
    license: "MIT / Apache-2.0",
    usage: "开发、构建与类型检查工具链。",
  },
];

export function AboutWorkspace(): ReactElement {
  return (
    <div className="min-h-0 flex-1 overflow-auto px-5 py-4">
      <div className="mx-auto grid max-w-5xl gap-5">
        <section className="flex items-center gap-4 rounded-md border bg-white/80 p-5 shadow-sm">
          <img
            alt=""
            aria-hidden="true"
            className="size-16 shrink-0"
            draggable={false}
            src={appIconUrl}
          />
          <div className="min-w-0">
            <h2 className="text-lg font-semibold">Tide X</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
              Tide X 是一个面向桌面的下载管理器，基于 aria2 提供多协议任务下载、
              队列管理、下载详情查看、托盘驻留和完成提醒。
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span className="rounded-md border bg-background px-2.5 py-1">
                版本 {appVersion}
              </span>
              <span className="rounded-md border bg-background px-2.5 py-1">
                产品名称 Tide X
              </span>
              <span className="rounded-md border bg-background px-2.5 py-1">
                应用标识 com.tidex.downloads
              </span>
            </div>
          </div>
        </section>

        <div className="grid gap-5 min-[980px]:grid-cols-[1fr_1.25fr]">
          <section className="rounded-md border bg-white/80 p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <PackageCheck
                aria-hidden="true"
                className="text-primary"
                size={18}
              />
              <h3 className="text-sm font-semibold">产品说明</h3>
            </div>
            <div className="mt-4 grid gap-3 text-sm leading-6 text-muted-foreground">
              <p>
                Tide X 聚焦高效、安静的下载工作流：添加链接后可以在主界面追踪进度、
                速度、文件列表和运行日志。
              </p>
              <p>
                应用会在系统托盘中保持下载任务运行，并在任务完成或失败时发出桌面通知。
              </p>
              <p>
                下载核心由随应用分发的 aria2 可执行文件提供，配置项可在设置页调整。
              </p>
            </div>
          </section>

          <section className="rounded-md border bg-white/80 p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <ShieldCheck
                aria-hidden="true"
                className="text-primary"
                size={18}
              />
              <h3 className="text-sm font-semibold">开源软件信息</h3>
            </div>
            <div className="mt-4 overflow-hidden rounded-md border">
              <div className="grid grid-cols-[1fr_92px_1.6fr] bg-muted/60 px-3 py-2 text-xs font-medium text-muted-foreground">
                <span>组件</span>
                <span>许可证</span>
                <span>用途</span>
              </div>
              {openSourceItems.map((item) => (
                <div
                  className="grid grid-cols-[1fr_92px_1.6fr] border-t px-3 py-2 text-xs leading-5"
                  key={item.name}
                >
                  <span className="font-medium">{item.name}</span>
                  <span className="text-muted-foreground">{item.license}</span>
                  <span className="text-muted-foreground">{item.usage}</span>
                </div>
              ))}
            </div>
            <p className="mt-3 flex items-start gap-2 text-xs leading-5 text-muted-foreground">
              <ExternalLink aria-hidden="true" className="mt-0.5" size={14} />
              <span>
                aria2 的原始许可、作者和变更记录随运行时文件保留在
                resources/aria2 目录中；完整依赖版本以 package.json 与锁文件为准。
              </span>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
