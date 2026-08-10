import type { AddDownloadInput, AppSettings } from "@shared/types";
import { mkdir, readFile } from "node:fs/promises";
import { extname, isAbsolute } from "node:path";

export type ParsedDownloadInput =
  | {
      kind: "uri";
      source: string;
      options: Record<string, string>;
    }
  | {
      kind: "torrent";
      source: string;
      contentBase64: string;
      options: Record<string, string>;
    }
  | {
      kind: "metalink";
      source: string;
      contentBase64: string;
      options: Record<string, string>;
    };

export async function parseDownloadInput(
  input: AddDownloadInput,
  settings: AppSettings,
): Promise<ParsedDownloadInput> {
  const source = input.source.trim();

  if (!source) {
    throw new Error("请输入下载任务来源。");
  }

  const fileName = normalizeDownloadFileName(input.fileName);

  if (fileName && !isHttpUrl(source)) {
    throw new Error("自定义文件名仅适用于 HTTP/HTTPS 单文件下载。");
  }

  const options = createTaskOptions(input, settings, fileName);
  await mkdir(options.dir, { recursive: true });

  if (isHttpUrl(source) || isMagnetLink(source)) {
    return {
      kind: "uri",
      source,
      options: isHttpUrl(source)
        ? addHttpCompatibilityOptions(source, options)
        : options,
    };
  }

  if (isAbsolute(source)) {
    const extension = extname(source).toLowerCase();

    if (extension === ".torrent") {
      return {
        kind: "torrent",
        source,
        contentBase64: await readFileAsBase64(source),
        options,
      };
    }

    if (extension === ".metalink" || extension === ".meta4") {
      return {
        kind: "metalink",
        source,
        contentBase64: await readFileAsBase64(source),
        options,
      };
    }
  }

  throw new Error(
    "不支持的下载任务来源。请使用 HTTP/HTTPS、Magnet、torrent 或 Metalink。",
  );
}

function createTaskOptions(
  input: AddDownloadInput,
  settings: AppSettings,
  fileName: string | null,
): Record<string, string> {
  const options: Record<string, string> = {
    dir: input.directory?.trim() || settings.downloadDirectory,
    "max-connection-per-server": String(settings.connectionsPerTask),
  };

  if (fileName) {
    options.out = fileName;
  }

  if (settings.globalDownloadLimit !== null) {
    options["max-download-limit"] = String(settings.globalDownloadLimit);
  }

  if (settings.globalUploadLimit !== null) {
    options["max-upload-limit"] = String(settings.globalUploadLimit);
  }

  if (settings.proxyUrl) {
    options["all-proxy"] = settings.proxyUrl;
  }

  for (const [key, value] of Object.entries(settings.advancedAria2Options)) {
    if (isReservedRuntimeOption(key)) {
      continue;
    }

    options[key] = value;
  }

  return options;
}

function normalizeDownloadFileName(value: string | undefined): string | null {
  const fileName = value?.trim();

  if (!fileName) {
    return null;
  }

  if (
    fileName === "." ||
    fileName === ".." ||
    /[<>:"/\\|?*\u0000-\u001f]/u.test(fileName) ||
    /[. ]$/u.test(fileName)
  ) {
    throw new Error("文件名包含无效字符，或以空格、句点结尾。");
  }

  return fileName;
}

function addHttpCompatibilityOptions(
  source: string,
  options: Record<string, string>,
): Record<string, string> {
  const url = new URL(source);
  return {
    ...options,
    referer: options.referer ?? `${url.origin}/`,
    "user-agent":
      options["user-agent"] ??
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36 TideX/0.1.0",
  };
}

function isReservedRuntimeOption(key: string): boolean {
  return key === "enable-rpc" || key.startsWith("rpc-");
}

function isHttpUrl(source: string): boolean {
  try {
    const url = new URL(source);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function isMagnetLink(source: string): boolean {
  return source.toLowerCase().startsWith("magnet:?");
}

async function readFileAsBase64(path: string): Promise<string> {
  return (await readFile(path)).toString("base64");
}
