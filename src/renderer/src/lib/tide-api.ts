import type { TideApi } from "@shared/types";

const missingApiMessage =
  "下载服务暂不可用，请确认 Tide X 桌面服务已正常启动后重试。";

export function getTideApi(): TideApi {
  const api = window.tide;

  if (
    !api?.downloads?.add ||
    !api.downloads.getSnapshot ||
    !api.settings?.get
  ) {
    throw new Error(missingApiMessage);
  }

  return api;
}

export function normalizeUserError(caught: unknown): string {
  const message = caught instanceof Error ? caught.message : String(caught);

  if (
    message.includes("Cannot read properties of undefined") ||
    message.includes("Cannot destructure property") ||
    message.includes("is not a function")
  ) {
    return missingApiMessage;
  }

  if (!message || message === "undefined") {
    return "操作失败，请稍后重试。";
  }

  if (message.includes("aria2 runtime is not available")) {
    return "下载引擎不可用，请确认 aria2 已成功启动后重试。";
  }

  return message;
}
