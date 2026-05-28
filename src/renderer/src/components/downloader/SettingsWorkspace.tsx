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
        <SettingsGroup title="Download Engine">
          <label className="grid gap-2">
            <span className="text-xs font-medium">Download Engine</span>
            <Input readOnly value="aria2" />
          </label>
          <NumberField
            label="Listen Port"
            min={1}
            onChange={() => undefined}
            value={6800}
          />
          <NumberField
            label="Max Connections per Server"
            min={1}
            onChange={(connectionsPerTask) =>
              setDraft({ ...draft, connectionsPerTask })
            }
            value={draft.connectionsPerTask}
          />
        </SettingsGroup>

        <SettingsGroup title="Startup">
          <SwitchRow label="Start with Windows" value={false} />
          <SwitchRow label="Start minimized" value />
          <SwitchRow label="Show tray icon" value />
        </SettingsGroup>

        <SettingsGroup title="Default Save Folder">
          <DirectoryField
            label="Save Folder"
            onBrowse={actions.selectDirectory}
            onChange={(downloadDirectory) =>
              setDraft({ ...draft, downloadDirectory })
            }
            recentDirectories={draft.recentDownloadDirectories}
            value={draft.downloadDirectory}
          />
        </SettingsGroup>

        <SettingsGroup title="Appearance">
          <label className="grid gap-2">
            <span className="text-xs font-medium">Theme</span>
            <Input readOnly value={draft.theme} />
          </label>
          <SwitchRow label="Light interface" value={draft.theme !== "dark"} />
        </SettingsGroup>

        <SettingsGroup title="Concurrent Downloads">
          <NumberField
            label="Maximum concurrent downloads"
            min={1}
            onChange={(maxConcurrentDownloads) =>
              setDraft({ ...draft, maxConcurrentDownloads })
            }
            value={draft.maxConcurrentDownloads}
          />
        </SettingsGroup>

        <SettingsGroup title="Network">
          <label className="grid gap-2">
            <span className="text-xs font-medium">Proxy</span>
            <Input
              onChange={(event) =>
                setDraft({ ...draft, proxyUrl: event.target.value || null })
              }
              placeholder="None"
              value={draft.proxyUrl ?? ""}
            />
          </label>
          <NumberField
            label="Proxy Port"
            min={0}
            onChange={() => undefined}
            value={8080}
          />
        </SettingsGroup>

        <SettingsGroup title="Speed Limit">
          <OptionalNumberField
            label="Global download speed limit"
            onChange={(globalDownloadLimit) =>
              setDraft({ ...draft, globalDownloadLimit })
            }
            value={draft.globalDownloadLimit}
          />
          <OptionalNumberField
            label="Global upload speed limit"
            onChange={(globalUploadLimit) =>
              setDraft({ ...draft, globalUploadLimit })
            }
            value={draft.globalUploadLimit}
          />
        </SettingsGroup>

        <SettingsGroup title="Advanced">
          <label className="grid gap-2">
            <span className="text-xs font-medium">aria2 options JSON</span>
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
          Save Settings
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
