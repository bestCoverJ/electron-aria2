import type {
  AddDownloadInput,
  AppSettings,
  DownloadSourceKind,
} from "@shared/types";
import { mkdir, readFile } from "node:fs/promises";
import type { NormalizedDownloadSource } from "./source-normalization";
import { normalizeDownloadSource } from "./source-normalization";

interface ParsedDownloadBase {
  source: string;
  originalSource: string;
  displaySource: string;
  canonicalKey: string;
  sourceKind: DownloadSourceKind;
  options: Record<string, string>;
}

export type ParsedDownloadInput =
  | (ParsedDownloadBase & { kind: "uri" })
  | (ParsedDownloadBase & { kind: "torrent"; contentBase64: string })
  | (ParsedDownloadBase & { kind: "metalink"; contentBase64: string });

export async function parseDownloadInput(
  input: AddDownloadInput,
  settings: AppSettings,
): Promise<ParsedDownloadInput> {
  const normalized = normalizeDownloadSource(input.source);
  const fileName = normalizeDownloadFileName(input.fileName);

  if (fileName && !normalized.canRename) {
    throw new Error(
      "自定义文件名仅适用于单条普通 HTTP/HTTPS/FTP/SFTP 文件链接。",
    );
  }

  const options = createTaskOptions(input, settings, fileName, normalized);
  await mkdir(options.dir, { recursive: true });
  const base: ParsedDownloadBase = {
    source: normalized.transportSource,
    originalSource: normalized.originalSource,
    displaySource: normalized.displaySource,
    canonicalKey: normalized.canonicalKey,
    sourceKind: normalized.kind,
    options,
  };

  if (!normalized.localPath) {
    return { ...base, kind: "uri" };
  }

  return normalized.kind === "torrent"
    ? {
        ...base,
        kind: "torrent",
        contentBase64: await readFileAsBase64(normalized.localPath),
      }
    : {
        ...base,
        kind: "metalink",
        contentBase64: await readFileAsBase64(normalized.localPath),
      };
}

function createTaskOptions(
  input: AddDownloadInput,
  settings: AppSettings,
  fileName: string | null,
  source: NormalizedDownloadSource,
): Record<string, string> {
  const options: Record<string, string> = {
    dir: input.directory?.trim() || settings.downloadDirectory,
    "max-connection-per-server": String(settings.connectionsPerTask),
  };

  if (!source.localPath && source.kind !== "magnet") {
    options["follow-torrent"] = "mem";
    options["follow-metalink"] = "mem";
  }

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
    if (!isReservedRuntimeOption(key)) {
      options[key] = value;
    }
  }

  return source.kind === "http"
    ? addHttpCompatibilityOptions(source.transportSource, options)
    : options;
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
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36 TideX/0.1.1",
  };
}

function isReservedRuntimeOption(key: string): boolean {
  return key === "enable-rpc" || key.startsWith("rpc-");
}

async function readFileAsBase64(path: string): Promise<string> {
  return (await readFile(path)).toString("base64");
}
