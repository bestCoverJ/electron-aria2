import type { AppSettings } from "@shared/types";
import { SlidersHorizontal } from "lucide-react";
import type { FormEvent, ReactElement } from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
      className="min-h-0 flex-1 overflow-auto px-5 py-4"
      onSubmit={handleSubmit}
    >
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
          <label className="grid gap-2">
            <span className="text-xs font-medium">主题</span>
            <Input readOnly value={draft.theme} />
          </label>
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

      {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}
      <div className="sticky bottom-0 mt-5 flex justify-end border-t bg-white py-3">
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
    <section className="rounded-md border bg-white p-4">
      <h2 className="mb-4 text-sm font-semibold">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
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
