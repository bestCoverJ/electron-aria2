export type Aria2Status =
  | "active"
  | "waiting"
  | "paused"
  | "error"
  | "complete"
  | "removed";

export interface Aria2File {
  index: string;
  path: string;
  length: string;
  completedLength: string;
  selected: "true" | "false";
}

export interface Aria2Task {
  gid: string;
  status: Aria2Status;
  totalLength: string;
  completedLength: string;
  uploadLength?: string;
  downloadSpeed: string;
  uploadSpeed: string;
  connections: string;
  dir?: string;
  files?: Aria2File[];
  bittorrent?: unknown;
  errorCode?: string;
  errorMessage?: string;
}
