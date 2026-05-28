import type { AppSettings, DownloadTaskMetadata } from "@shared/types";
import { app } from "electron";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { createDefaultSettings } from "../app-state";
import { normalizeSettingsPatch } from "./settings-validation";

interface PersistedState {
  settings: AppSettings;
  taskMetadata: Record<string, DownloadTaskMetadata>;
}

export class AppStore {
  private readonly filePath = join(app.getPath("userData"), "state.json");

  private state: PersistedState = this.readState();

  getSettings(): AppSettings {
    return this.state.settings;
  }

  async updateSettings(patch: Partial<AppSettings>): Promise<AppSettings> {
    const settings = await normalizeSettingsPatch(this.getSettings(), patch);
    this.state = { ...this.state, settings };
    this.writeState();
    return settings;
  }

  listTaskMetadata(): DownloadTaskMetadata[] {
    return Object.values(this.state.taskMetadata);
  }

  getTaskMetadata(gid: string): DownloadTaskMetadata | null {
    return this.state.taskMetadata[gid] ?? null;
  }

  upsertTaskMetadata(
    metadata: Omit<DownloadTaskMetadata, "createdAt" | "updatedAt"> &
      Partial<Pick<DownloadTaskMetadata, "createdAt" | "updatedAt">>,
  ): DownloadTaskMetadata {
    const now = new Date().toISOString();
    const current = this.state.taskMetadata;
    const existing = current[metadata.gid];
    const next: DownloadTaskMetadata = {
      ...metadata,
      createdAt: metadata.createdAt ?? existing?.createdAt ?? now,
      updatedAt: metadata.updatedAt ?? now,
    };

    this.state = {
      ...this.state,
      taskMetadata: {
        ...current,
        [next.gid]: next,
      },
    };
    this.writeState();

    return next;
  }

  removeTaskMetadata(gid: string): void {
    const current = { ...this.state.taskMetadata };
    delete current[gid];
    this.state = {
      ...this.state,
      taskMetadata: current,
    };
    this.writeState();
  }

  private readState(): PersistedState {
    const defaults = createDefaultState();

    try {
      const stored = JSON.parse(
        readFileSync(this.filePath, "utf8"),
      ) as Partial<PersistedState>;

      return {
        settings: {
          ...defaults.settings,
          ...(stored.settings ?? {}),
          recentDownloadDirectories: [
            ...(stored.settings?.recentDownloadDirectories ??
              defaults.settings.recentDownloadDirectories),
          ],
          advancedAria2Options: {
            ...defaults.settings.advancedAria2Options,
            ...(stored.settings?.advancedAria2Options ?? {}),
          },
        },
        taskMetadata: stored.taskMetadata ?? {},
      };
    } catch {
      return defaults;
    }
  }

  private writeState(): void {
    mkdirSync(dirname(this.filePath), { recursive: true });
    writeFileSync(this.filePath, `${JSON.stringify(this.state, null, 2)}\n`);
  }
}

function createDefaultState(): PersistedState {
  return {
    settings: createDefaultSettings(),
    taskMetadata: {},
  };
}
