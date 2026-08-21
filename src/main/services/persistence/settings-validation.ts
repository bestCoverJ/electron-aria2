import type { AppSettings } from "@shared/types";
import { access, mkdir } from "node:fs/promises";
import { constants } from "node:fs";

const allowedAdvancedOption = /^[a-z0-9][a-z0-9-]*$/;
const maxRecentDirectories = 8;

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
  next.recentDownloadDirectories = normalizeRecentDirectories(
    next.recentDownloadDirectories,
    next.downloadDirectory,
  );
  validatePositiveInteger(
    next.maxConcurrentDownloads,
    "maxConcurrentDownloads",
  );
  validatePositiveInteger(next.connectionsPerTask, "connectionsPerTask");
  validateOptionalLimit(next.globalDownloadLimit, "globalDownloadLimit");
  validateOptionalLimit(next.globalUploadLimit, "globalUploadLimit");
  validateProxy(next.proxyUrl);
  next.fontFamily = normalizeFontFamily(next.fontFamily);
  validateAdvancedOptions(next.advancedAria2Options);
  next.windowBounds = normalizeWindowBounds(next.windowBounds);

  return next;
}

function normalizeFontFamily(value: string): string {
  const fontFamily = value.trim();

  if (!fontFamily) {
    throw new Error("字体名称不能为空。");
  }

  if (fontFamily.length > 80) {
    throw new Error("字体名称不能超过 80 个字符。");
  }

  if (!/^[\p{L}\p{N}\s.'_-]+$/u.test(fontFamily)) {
    throw new Error("字体名称包含不支持的字符。");
  }

  return fontFamily;
}

function normalizeWindowBounds(
  bounds: AppSettings["windowBounds"],
): AppSettings["windowBounds"] {
  return {
    x: Number.isFinite(bounds.x) ? Math.round(bounds.x!) : null,
    y: Number.isFinite(bounds.y) ? Math.round(bounds.y!) : null,
    width: Math.max(760, Math.round(bounds.width || 760)),
    height: Math.max(520, Math.round(bounds.height || 520)),
    maximized: Boolean(bounds.maximized),
  };
}

export function normalizeRecentDirectories(
  directories: string[],
  preferredDirectory?: string,
): string[] {
  const normalized = new Map<string, string>();
  const candidates = [preferredDirectory, ...directories].filter(
    (value): value is string => Boolean(value?.trim()),
  );

  for (const directory of candidates) {
    const trimmed = directory.trim();
    const key =
      process.platform === "win32" ? trimmed.toLocaleLowerCase() : trimmed;

    if (!normalized.has(key)) {
      normalized.set(key, trimmed);
    }
  }

  return [...normalized.values()].slice(0, maxRecentDirectories);
}

async function validateDownloadDirectory(path: string): Promise<void> {
  if (!path.trim()) {
    throw new Error("请选择或输入默认保存目录。");
  }

  try {
    await mkdir(path, { recursive: true });
    await access(path, constants.W_OK);
  } catch {
    throw new Error("保存目录不可用，请检查路径是否正确并确认有写入权限。");
  }
}

function validatePositiveInteger(value: number, field: string): void {
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`${getSettingLabel(field)}必须是大于 0 的整数。`);
  }
}

function validateOptionalLimit(value: number | null, field: string): void {
  if (value === null) {
    return;
  }

  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${getSettingLabel(field)}必须是大于或等于 0 的整数。`);
  }
}

function validateProxy(value: string | null): void {
  if (value === null || value.trim() === "") {
    return;
  }

  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new Error("请输入完整代理地址，例如 http://127.0.0.1:8080。");
  }

  if (!["http:", "https:", "socks4:", "socks5:"].includes(url.protocol)) {
    throw new Error("代理地址仅支持 http、https、socks4 或 socks5 协议。");
  }
}

function validateAdvancedOptions(options: Record<string, string>): void {
  for (const [key, value] of Object.entries(options)) {
    if (!allowedAdvancedOption.test(key)) {
      throw new Error(`aria2 选项名称“${key}”格式不正确。`);
    }

    if (isReservedRuntimeOption(key)) {
      throw new Error(`aria2 选项“${key}”由 TideX 管理，不能手动修改。`);
    }

    if (typeof value !== "string") {
      throw new Error(`aria2 选项“${key}”的值必须是字符串。`);
    }

    if (value.includes("\n") || value.includes("\r")) {
      throw new Error(`aria2 选项“${key}”的值不能包含换行。`);
    }
  }
}

function getSettingLabel(field: string): string {
  const labels: Record<string, string> = {
    maxConcurrentDownloads: "最大并发下载数",
    connectionsPerTask: "单任务最大连接数",
    globalDownloadLimit: "全局下载限速",
    globalUploadLimit: "全局上传限速",
  };

  return labels[field] ?? "设置值";
}

function isReservedRuntimeOption(key: string): boolean {
  return key === "enable-rpc" || key.startsWith("rpc-");
}
