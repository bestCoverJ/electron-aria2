import type { DownloadSourceKind } from "@shared/types";
import { extname, isAbsolute, normalize } from "node:path";

export interface NormalizedDownloadSource {
  originalSource: string;
  transportSource: string;
  displaySource: string;
  canonicalKey: string;
  kind: DownloadSourceKind;
  localPath: string | null;
  remoteDescriptor: "torrent" | "metalink" | null;
  canRename: boolean;
}

export type PreparedDownloadBatchItem =
  | {
      source: string;
      status: "ready";
      normalized: NormalizedDownloadSource;
    }
  | {
      source: string;
      status: "failed" | "skipped";
      error: string;
    };

export const maxDownloadBatchSize = 100;

export function prepareDownloadBatch(
  values: string[],
): PreparedDownloadBatchItem[] {
  const sources = values.map((source) => source.trim()).filter(Boolean);

  if (sources.length === 0) {
    throw new Error("请至少输入一条下载来源。");
  }

  if (sources.length > maxDownloadBatchSize) {
    throw new Error(`单次最多添加 ${maxDownloadBatchSize} 条下载来源。`);
  }

  const seen = new Set<string>();

  return sources.map((source) => {
    try {
      const normalized = normalizeDownloadSource(source);

      if (seen.has(normalized.canonicalKey)) {
        return {
          source,
          status: "skipped" as const,
          error: "同批次重复链接，已跳过。",
        };
      }

      seen.add(normalized.canonicalKey);
      return { source, status: "ready" as const, normalized };
    } catch (caught) {
      return {
        source,
        status: "failed" as const,
        error: caught instanceof Error ? caught.message : "无法解析下载来源。",
      };
    }
  });
}

export function normalizeDownloadSource(
  value: string,
): NormalizedDownloadSource {
  const originalSource = value.trim();

  if (!originalSource) {
    throw new Error("请输入下载任务来源。");
  }

  if (isAbsolute(originalSource)) {
    return normalizeLocalDescriptor(originalSource);
  }

  const scheme = getSourceScheme(originalSource);

  if (!scheme) {
    throw new Error("无法识别下载来源，请输入完整链接或选择任务文件。");
  }

  if (scheme === "ed2k") {
    throw new Error("当前版本不支持 ed2k 链接。");
  }

  if (scheme === "thunderx") {
    throw new Error(
      "当前仅支持经典 thunder:// 链接，不支持 thunderx 或迅雷云盘链接。",
    );
  }

  if (scheme === "thunder" || scheme === "flashget" || scheme === "qqdl") {
    return normalizeWrappedSource(originalSource, scheme);
  }

  if (scheme === "magnet") {
    return normalizeMagnetSource(originalSource);
  }

  if (["http", "https", "ftp", "sftp"].includes(scheme)) {
    return normalizeDirectUrl(originalSource);
  }

  throw new Error(`当前不支持 ${scheme}:// 协议。`);
}

export function redactDownloadSource(value: string): string {
  try {
    const url = new URL(value);

    if (["http:", "https:", "ftp:", "sftp:"].includes(url.protocol)) {
      url.username = "";
      url.password = "";
      return url.toString();
    }
  } catch {
    // Local paths and wrapper labels do not require URL redaction.
  }

  return value;
}

function normalizeLocalDescriptor(source: string): NormalizedDownloadSource {
  const extension = extname(source).toLowerCase();
  const kind =
    extension === ".torrent"
      ? "torrent"
      : extension === ".metalink" || extension === ".meta4"
        ? "metalink"
        : null;

  if (!kind) {
    throw new Error("本地任务文件仅支持 .torrent、.metalink 或 .meta4。");
  }

  const normalizedPath = normalize(source);
  const canonicalPath =
    process.platform === "win32"
      ? normalizedPath.toLowerCase()
      : normalizedPath;

  return {
    originalSource: source,
    transportSource: normalizedPath,
    displaySource: normalizedPath,
    canonicalKey: `file:${canonicalPath}`,
    kind,
    localPath: normalizedPath,
    remoteDescriptor: null,
    canRename: false,
  };
}

function normalizeDirectUrl(source: string): NormalizedDownloadSource {
  let url: URL;

  try {
    url = new URL(source);
  } catch {
    throw new Error("下载链接格式不正确。");
  }

  if (!["http:", "https:", "ftp:", "sftp:"].includes(url.protocol)) {
    throw new Error("经典下载链接转换后的协议不受支持。");
  }

  if (
    ["pan.xunlei.com", "pan.xunlei.cn"].includes(url.hostname.toLowerCase())
  ) {
    throw new Error("当前版本不支持迅雷云盘分享链接。");
  }

  if (!url.hostname) {
    throw new Error("下载链接缺少主机地址。");
  }

  const protocol = url.protocol.slice(0, -1).toLowerCase();
  const kind: DownloadSourceKind =
    protocol === "http" || protocol === "https" ? "http" : "ftp";
  const extension = extname(url.pathname).toLowerCase();
  const remoteDescriptor =
    extension === ".torrent"
      ? "torrent"
      : extension === ".metalink" || extension === ".meta4"
        ? "metalink"
        : null;

  return {
    originalSource: source,
    transportSource: url.toString(),
    displaySource: redactDownloadSource(url.toString()),
    canonicalKey: `url:${url.toString()}`,
    kind,
    localPath: null,
    remoteDescriptor,
    canRename: remoteDescriptor === null,
  };
}

function normalizeMagnetSource(source: string): NormalizedDownloadSource {
  let url: URL;

  try {
    url = new URL(source);
  } catch {
    throw new Error("Magnet 链接格式不正确。");
  }

  if (!url.searchParams.get("xt")) {
    throw new Error("Magnet 链接缺少 xt 参数。");
  }

  return {
    originalSource: source,
    transportSource: source,
    displaySource: source,
    canonicalKey: `magnet:${source.toLowerCase()}`,
    kind: "magnet",
    localPath: null,
    remoteDescriptor: null,
    canRename: false,
  };
}

function normalizeWrappedSource(
  source: string,
  scheme: "thunder" | "flashget" | "qqdl",
): NormalizedDownloadSource {
  const rawPayload = source.slice(source.indexOf("://") + 3);
  const payload =
    scheme === "flashget" ? rawPayload.split("&", 1)[0] : rawPayload;
  const decoded = decodeBase64Payload(payload, scheme);
  const directSource = unwrapDecodedSource(decoded, scheme);
  const direct = normalizeDirectUrl(directSource);

  return {
    ...direct,
    originalSource: source,
    displaySource: `${scheme}:// → ${direct.displaySource}`,
    canonicalKey: `url:${direct.transportSource}`,
    kind: scheme,
    canRename: false,
  };
}

function decodeBase64Payload(payload: string, scheme: string): string {
  let decodedPayload: string;

  try {
    decodedPayload = decodeURIComponent(payload.trim());
  } catch {
    throw new Error(`${scheme} 链接包含无效转义字符。`);
  }

  const normalized = decodedPayload.replace(/-/gu, "+").replace(/_/gu, "/");

  if (
    !normalized ||
    normalized.length % 4 === 1 ||
    !/^[A-Za-z0-9+/]*={0,2}$/u.test(normalized)
  ) {
    throw new Error(`${scheme} 链接的 Base64 内容无效。`);
  }

  const padded = normalized.padEnd(
    normalized.length + ((4 - (normalized.length % 4)) % 4),
    "=",
  );

  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(
      Buffer.from(padded, "base64"),
    );
  } catch {
    throw new Error(`${scheme} 链接无法按 UTF-8 解码。`);
  }
}

function unwrapDecodedSource(
  decoded: string,
  scheme: "thunder" | "flashget" | "qqdl",
): string {
  if (scheme === "thunder") {
    if (!decoded.startsWith("AA") || !decoded.endsWith("ZZ")) {
      throw new Error("thunder 链接缺少 AA…ZZ 包装标记。");
    }

    return decoded.slice(2, -2);
  }

  if (scheme === "flashget") {
    const marker = "[FLASHGET]";

    if (!decoded.startsWith(marker) || !decoded.endsWith(marker)) {
      throw new Error("flashget 链接缺少 [FLASHGET] 包装标记。");
    }

    return decoded.slice(marker.length, -marker.length);
  }

  return decoded;
}

function getSourceScheme(source: string): string | null {
  const match = /^([a-z][a-z0-9+.-]*):/iu.exec(source);
  return match?.[1]?.toLowerCase() ?? null;
}
