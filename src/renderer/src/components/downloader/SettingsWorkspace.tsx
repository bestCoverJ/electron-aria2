import type { AppSettings, ThemePreference } from "@shared/types";
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
import { Switch } from "@/components/ui/switch";
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      const advancedAria2Options = JSON.parse(advancedText) as Record<
        string,
        string
      >;
      await actions.updateSettings({ ...draft, advancedAria2Options });
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
            <NumberField
              label="监听端口"
              min={1}
              onChange={() => undefined}
              value={6800}
            />
            <NumberField
              label="单任务最大连接数"
              min={1}
              onChange={(connectionsPerTask) =>
                setDraft({ ...draft, connectionsPerTask })
              }
              value={draft.connectionsPerTask}
            />
          </SettingsGroup>

          <SettingsGroup title="启动">
            <SwitchRow label="开机启动" value={false} />
            <SwitchRow label="启动时最小化" value />
            <SwitchRow label="显示托盘图标" value />
          </SettingsGroup>

          <SettingsGroup title="默认保存目录">
            <DirectoryField
              label="保存目录"
              onBrowse={actions.selectDirectory}
              onChange={(downloadDirectory) =>
                setDraft({ ...draft, downloadDirectory })
              }
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
            <SwitchRow label="浅色界面" value={draft.theme !== "dark"} />
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
            <NumberField
              label="代理端口"
              min={0}
              onChange={() => undefined}
              value={8080}
            />
          </SettingsGroup>

          <SettingsGroup title="速度限制">
            <OptionalNumberField
              label="全局下载限速"
              onChange={(globalDownloadLimit) =>
                setDraft({ ...draft, globalDownloadLimit })
              }
              value={draft.globalDownloadLimit}
            />
            <OptionalNumberField
              label="全局上传限速"
              onChange={(globalUploadLimit) =>
                setDraft({ ...draft, globalUploadLimit })
              }
              value={draft.globalUploadLimit}
            />
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
      </div>

      <div className="flex h-16 shrink-0 items-center justify-end border-t bg-card/80 px-5 backdrop-blur-xl">
        <Button disabled={isSaving} type="submit">
          <SlidersHorizontal aria-hidden="true" size={14} />
          保存设置
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

function SwitchRow({ label, value }: { label: string; value: boolean }) {
  return (
    <div className="flex h-9 items-center justify-between gap-3">
      <span className="text-xs font-medium">{label}</span>
      <Switch checked={value} />
    </div>
  );
}
