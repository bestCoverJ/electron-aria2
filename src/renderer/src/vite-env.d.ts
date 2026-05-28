/// <reference types="vite/client" />

import type { TideApi } from "@shared/types";

declare global {
  interface Window {
    tide?: TideApi;
  }
}

export {};
