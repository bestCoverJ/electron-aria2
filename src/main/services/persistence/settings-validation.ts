import type { AppSettings } from "@shared/types";
import { access, mkdir } from "node:fs/promises";
import { constants } from "node:fs";

const allowedAdvancedOption = /^[a-z0-9][a-z0-9-]*$/;

export async function normalizeSettingsPatch(
  current: AppSettings,
  patch: Partial<AppSettings>,
): Promise<AppSettings> {
  const next: AppSettings = {
    ...current,
    ...patch,
    advancedAria2Options: {
      ...current.advancedAria2Options,
      ...(patch.advancedAria2Options ?? {}),
    },
  };

  await validateDownloadDirectory(next.downloadDirectory);
  validatePositiveInteger(
    next.maxConcurrentDownloads,
    "maxConcurrentDownloads",
  );
  validatePositiveInteger(next.connectionsPerTask, "connectionsPerTask");
  validateOptionalLimit(next.globalDownloadLimit, "globalDownloadLimit");
  validateOptionalLimit(next.globalUploadLimit, "globalUploadLimit");
  validateProxy(next.proxyUrl);
  validateAdvancedOptions(next.advancedAria2Options);

  return next;
}

async function validateDownloadDirectory(path: string): Promise<void> {
  if (!path.trim()) {
    throw new Error("Download directory is required.");
  }

  await mkdir(path, { recursive: true });
  await access(path, constants.W_OK);
}

function validatePositiveInteger(value: number, field: string): void {
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`${field} must be a positive integer.`);
  }
}

function validateOptionalLimit(value: number | null, field: string): void {
  if (value === null) {
    return;
  }

  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${field} must be null or a non-negative integer.`);
  }
}

function validateProxy(value: string | null): void {
  if (value === null || value.trim() === "") {
    return;
  }

  const url = new URL(value);

  if (!["http:", "https:", "socks4:", "socks5:"].includes(url.protocol)) {
    throw new Error("Proxy URL must use http, https, socks4, or socks5.");
  }
}

function validateAdvancedOptions(options: Record<string, string>): void {
  for (const [key, value] of Object.entries(options)) {
    if (!allowedAdvancedOption.test(key)) {
      throw new Error(`Invalid aria2 option name: ${key}.`);
    }

    if (value.includes("\n") || value.includes("\r")) {
      throw new Error(`Invalid aria2 option value for ${key}.`);
    }
  }
}
