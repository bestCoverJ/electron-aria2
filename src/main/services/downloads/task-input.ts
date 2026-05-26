import type { AddDownloadInput, AppSettings } from "@shared/types";
import { readFile } from "node:fs/promises";
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
    throw new Error("Download source is required.");
  }

  const options = createTaskOptions(input, settings);

  if (isHttpUrl(source) || isMagnetLink(source)) {
    return {
      kind: "uri",
      source,
      options,
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
    "Unsupported download input. Use HTTP/HTTPS, Magnet, torrent, or Metalink.",
  );
}

function createTaskOptions(
  input: AddDownloadInput,
  settings: AppSettings,
): Record<string, string> {
  const options: Record<string, string> = {
    dir: input.directory?.trim() || settings.downloadDirectory,
    "max-connection-per-server": String(settings.connectionsPerTask),
  };

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
    options[key] = value;
  }

  return options;
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
