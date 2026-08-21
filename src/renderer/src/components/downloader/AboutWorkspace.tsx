import { Download, RefreshCw, RotateCcw, ShieldCheck } from "lucide-react";
import { useEffect, useState, type ReactElement } from "react";
import type { ApplicationUpdateSnapshot } from "@shared/types";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import packageJson from "../../../../../package.json";
import appIconUrl from "../../../../../resources/assets/icons/tide-logo.png?url";

const appVersion = packageJson.version;

const initialUpdateSnapshot: ApplicationUpdateSnapshot = {
  currentVersion: appVersion,
  phase: "idle",
  availableVersion: null,
  downloadPercent: null,
  transferredBytes: null,
  totalBytes: null,
  errorMessage: null,
};

const updateLabels: Record<ApplicationUpdateSnapshot["phase"], string> = {
  disabled: "开发模式不检查更新",
  idle: "尚未检查更新",
  checking: "正在检查更新…",
  available: "发现新版本",
  "not-available": "已是最新版本",
  downloading: "正在下载更新…",
  downloaded: "更新已就绪",
  error: "更新操作失败",
};

const openSourceItems = [
  {
    name: "aria2",
    version: "1.37.0",
    license: "GPL-2.0",
    usage: "下载引擎，负责 HTTP、FTP、BitTorrent、Metalink 等任务传输。",
  },
  {
    name: "Electron",
    version: "33.4.11",
    license: "MIT",
    usage: "桌面应用运行时。",
  },
  {
    name: "React",
    version: "19.2.6",
    license: "MIT",
    usage: "用户界面构建。",
  },
  {
    name: "Radix UI",
    version: "2.1.16 / 2.2.6",
    license: "MIT",
    usage: "基础交互组件。",
  },
  {
    name: "lucide-react",
    version: "0.468.0",
    license: "ISC",
    usage: "界面图标。",
  },
  {
    name: "Tailwind CSS",
    version: "3.4.19",
    license: "MIT",
    usage: "界面样式系统。",
  },
  {
    name: "Vite / TypeScript",
    version: "6.4.2 / 5.9.3",
    license: "MIT / Apache-2.0",
    usage: "开发、构建与类型检查工具链。",
  },
];

export function AboutWorkspace(): ReactElement {
  const updatesApi = window.tide?.updates;
  const [update, setUpdate] = useState(initialUpdateSnapshot);
  const [actionPending, setActionPending] = useState(false);

  useEffect(() => {
    if (!updatesApi) {
      setUpdate((snapshot) => ({ ...snapshot, phase: "disabled" }));
      return;
    }

    let active = true;
    void updatesApi.getSnapshot().then((snapshot) => {
      if (active) setUpdate(snapshot);
    });
    const unsubscribe = updatesApi.onStatusChanged((snapshot) => {
      if (active) setUpdate(snapshot);
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, [updatesApi]);

  const runUpdateAction = async (
    action: () => Promise<ApplicationUpdateSnapshot>,
  ): Promise<void> => {
    setActionPending(true);
    try {
      setUpdate(await action());
    } finally {
      setActionPending(false);
    }
  };

  return (
    <div className="min-h-0 flex-1 overflow-auto px-4 py-4 min-[1040px]:px-5">
      <div className="mx-auto grid max-w-5xl gap-4 min-[1040px]:gap-5">
        <section className="flex items-center gap-4 rounded-md border bg-white/80 p-4 shadow-sm dark:bg-card/80 min-[1040px]:p-5">
          <img
            alt=""
            aria-hidden="true"
            className="size-12 shrink-0 min-[1040px]:size-16"
            draggable={false}
            src={appIconUrl}
          />
          <div className="min-w-0">
            <h2 className="text-lg font-semibold">Tide X</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
              基于 aria2 的桌面下载管理器，支持
              HTTP/HTTPS、FTP/SFTP、Magnet、torrent、 Metalink 及经典
              Thunder/FlashGet/QQDL 链接。
            </p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              暂不支持 ed2k、thunderx、迅雷云盘或需要账号服务的分享链接。
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

        <section className="rounded-md border bg-white/80 p-4 shadow-sm dark:bg-card/80 min-[1040px]:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold">应用更新</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                {updateLabels[update.phase]}
                {update.availableVersion
                  ? ` · 新版本 ${update.availableVersion}`
                  : ""}
              </p>
            </div>
            {update.phase === "available" ? (
              <Button
                disabled={actionPending}
                onClick={() =>
                  void runUpdateAction(() => updatesApi!.download())
                }
                size="sm"
              >
                <Download size={14} />
                下载更新
              </Button>
            ) : update.phase === "downloaded" ? (
              <Button onClick={() => void updatesApi?.install()} size="sm">
                <RotateCcw size={14} />
                重启并安装
              </Button>
            ) : (
              <Button
                disabled={
                  actionPending ||
                  update.phase === "disabled" ||
                  update.phase === "checking" ||
                  update.phase === "downloading"
                }
                onClick={() => void runUpdateAction(() => updatesApi!.check())}
                size="sm"
                variant="outline"
              >
                <RefreshCw
                  className={update.phase === "checking" ? "animate-spin" : ""}
                  size={14}
                />
                检查更新
              </Button>
            )}
          </div>
          {update.phase === "downloading" ? (
            <div className="mt-4">
              <Progress value={update.downloadPercent ?? 0} />
              <p className="mt-1.5 text-right text-xs text-muted-foreground">
                {(update.downloadPercent ?? 0).toFixed(1)}%
              </p>
            </div>
          ) : null}
          {update.errorMessage ? (
            <p className="mt-3 text-xs text-destructive" role="alert">
              {update.errorMessage}
            </p>
          ) : null}
        </section>

        <section className="rounded-md border bg-white/80 p-4 shadow-sm dark:bg-card/80 min-[1040px]:p-5">
          <div className="flex items-center gap-2">
            <ShieldCheck
              aria-hidden="true"
              className="text-primary"
              size={18}
            />
            <h3 className="text-sm font-semibold">当前依赖版本</h3>
          </div>
          <div className="mt-4 overflow-x-auto rounded-md border">
            <div className="grid min-w-[560px] grid-cols-[0.85fr_1.1fr_92px_1.7fr] bg-muted/60 px-3 py-2 text-xs font-medium text-muted-foreground">
              <span>组件</span>
              <span>版本</span>
              <span>许可证</span>
              <span>用途</span>
            </div>
            {openSourceItems.map((item) => (
              <div
                className="grid min-w-[560px] grid-cols-[0.85fr_1.1fr_92px_1.7fr] border-t px-3 py-2 text-xs leading-5"
                key={item.name}
              >
                <span className="font-medium">{item.name}</span>
                <span
                  className="truncate pr-2 text-muted-foreground"
                  title={item.version}
                >
                  {item.version}
                </span>
                <span className="text-muted-foreground">{item.license}</span>
                <span className="text-muted-foreground">{item.usage}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
