import type {
  AppSettings,
  ShutdownBehavior,
  ThemePreference,
} from "@shared/types";
import { SlidersHorizontal } from "lucide-react";
import type { FormEvent, ReactElement } from "react";
import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useDownloads } from "@/hooks/use-downloads";
import { normalizeUserError } from "@/lib/tide-api";
import { DirectoryField, NumberField, OptionalNumberField } from "./shared";

export function SettingsWorkspace({
  actions,
  settings,
}: {
  actions: ReturnType<typeof useDownloads>["actions"];
  settings: AppSettings;
}) {
  const [draft, setDraft] = useState(settings);
  const [advancedText, setAdvancedText] = useState(
    JSON.stringify(settings.advancedAria2Options, null, 2),
  );
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      let advancedAria2Options: Record<string, string>;

      try {
        const parsed = JSON.parse(advancedText) as unknown;

        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
          throw new TypeError();
        }

        advancedAria2Options = parsed as Record<string, string>;
      } catch {
        throw new Error("高级 aria2 选项必须是有效的 JSON 对象，例如 {}。");
      }
      await actions.updateSettings({ ...draft, advancedAria2Options });
      setSuccess("设置已保存并应用。");
    } catch (caught) {
      setError(normalizeUserError(caught));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form
      className="flex min-h-0 flex-1 flex-col overflow-hidden"
      onSubmit={handleSubmit}
    >
      <div className="min-h-0 flex-1 overflow-auto px-5 py-4">
        <div className="grid gap-5 min-[1160px]:grid-cols-2">
          <SettingsGroup title="下载引擎">
            <label className="grid gap-2">
              <span className="text-xs font-medium">下载引擎</span>
              <Input readOnly value="aria2" />
            </label>
            <label className="grid gap-2">
              <span className="text-xs font-medium">本地监听端口</span>
              <Input disabled value="6800（由 Tide X 管理）" />
            </label>
            <NumberField
              label="单任务最大连接数"
              min={1}
              onChange={(connectionsPerTask) =>
                setDraft({ ...draft, connectionsPerTask })
              }
              value={draft.connectionsPerTask}
            />
          </SettingsGroup>

          <SettingsGroup title="默认保存目录">
            <DirectoryField
              label="保存目录"
              onBrowse={actions.selectDirectory}
              onChange={(downloadDirectory) =>
                setDraft({ ...draft, downloadDirectory })
              }
              onError={(message) => setError(message)}
              recentDirectories={draft.recentDownloadDirectories}
              value={draft.downloadDirectory}
            />
          </SettingsGroup>

          <SettingsGroup title="外观">
            <div className="grid gap-2">
              <span className="text-xs font-medium">主题</span>
              <Select
                onValueChange={(theme) =>
                  setDraft({ ...draft, theme: theme as ThemePreference })
                }
                value={draft.theme}
              >
                <SelectTrigger aria-label="主题">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="system">跟随系统</SelectItem>
                    <SelectItem value="light">浅色</SelectItem>
                    <SelectItem value="dark">深色</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </SettingsGroup>

          <SettingsGroup title="关闭行为">
            <div className="grid gap-2">
              <span className="text-xs font-medium">关闭主窗口时</span>
              <Select
                onValueChange={(shutdownBehavior) =>
                  setDraft({
                    ...draft,
                    shutdownBehavior: shutdownBehavior as ShutdownBehavior,
                  })
                }
                value={draft.shutdownBehavior}
              >
                <SelectTrigger aria-label="关闭主窗口时">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="ask">每次询问</SelectItem>
                    <SelectItem value="minimize-to-tray">
                      最小化到托盘
                    </SelectItem>
                    <SelectItem value="quit">直接退出 Tide X</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
              <p className="text-xs leading-5 text-muted-foreground">
                后台运行时下载任务会继续，仍可从系统托盘打开 Tide X。
              </p>
            </div>
          </SettingsGroup>

          <SettingsGroup title="并发下载">
            <NumberField
              label="最大并发下载数"
              min={1}
              onChange={(maxConcurrentDownloads) =>
                setDraft({ ...draft, maxConcurrentDownloads })
              }
              value={draft.maxConcurrentDownloads}
            />
          </SettingsGroup>

          <SettingsGroup title="网络">
            <label className="grid gap-2">
              <span className="text-xs font-medium">代理</span>
              <Input
                onChange={(event) =>
                  setDraft({ ...draft, proxyUrl: event.target.value || null })
                }
                placeholder="无"
                value={draft.proxyUrl ?? ""}
              />
            </label>
            <p className="text-xs leading-5 text-muted-foreground">
              请输入完整地址并包含端口，例如 http://127.0.0.1:8080。
            </p>
          </SettingsGroup>

          <SettingsGroup title="速度限制">
            <OptionalNumberField
              label="全局下载限速（KB/s）"
              onChange={(globalDownloadLimit) =>
                setDraft({
                  ...draft,
                  globalDownloadLimit:
                    globalDownloadLimit === null
                      ? null
                      : globalDownloadLimit * 1024,
                })
              }
              value={
                draft.globalDownloadLimit === null
                  ? null
                  : Math.round(draft.globalDownloadLimit / 1024)
              }
            />
            <OptionalNumberField
              label="全局上传限速（KB/s）"
              onChange={(globalUploadLimit) =>
                setDraft({
                  ...draft,
                  globalUploadLimit:
                    globalUploadLimit === null
                      ? null
                      : globalUploadLimit * 1024,
                })
              }
              value={
                draft.globalUploadLimit === null
                  ? null
                  : Math.round(draft.globalUploadLimit / 1024)
              }
            />
            <p className="text-xs leading-5 text-muted-foreground">
              留空表示不限速，修改后立即应用到下载引擎。
            </p>
          </SettingsGroup>

          <SettingsGroup title="高级">
            <label className="grid gap-2">
              <span className="text-xs font-medium">aria2 选项 JSON</span>
              <Textarea
                className="min-h-28 font-mono"
                onChange={(event) => setAdvancedText(event.target.value)}
                value={advancedText}
              />
            </label>
          </SettingsGroup>
        </div>

        {error ? (
          <Alert className="mt-4" variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        {success ? (
          <Alert className="mt-4" role="status">
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        ) : null}
      </div>

      <div className="flex h-16 shrink-0 items-center justify-end border-t bg-card/80 px-5 backdrop-blur-xl">
        <Button disabled={isSaving} type="submit">
          <SlidersHorizontal aria-hidden="true" size={14} />
          {isSaving ? "正在保存…" : "保存设置"}
        </Button>
      </div>
    </form>
  );
}

function SettingsGroup({
  children,
  title,
}: {
  children: ReactElement | ReactElement[];
  title: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">{children}</CardContent>
    </Card>
  );
}
