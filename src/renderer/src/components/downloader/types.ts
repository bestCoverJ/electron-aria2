import type { Download } from "lucide-react";

export type MainView = "downloads" | "history" | "trash" | "settings" | "about";
export type DetailTab = "overview" | "files" | "peers" | "log";

export interface MenuItem {
  id: MainView;
  label: string;
  icon: typeof Download;
}
