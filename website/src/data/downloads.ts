export type DownloadStatus = "available" | "preparing" | "planned";

export interface PlatformDownload {
  platform: string;
  os: "windows" | "macos" | "linux";
  version: string;
  architecture: string;
  packageTypes: string[];
  status: DownloadStatus;
  statusLabel: string;
  primaryActionLabel: string;
  downloadUrl?: string;
  checksum?: string;
  size?: string;
  releaseDate?: string;
  caveat: string;
}

export const downloads: PlatformDownload[] = [
  {
    platform: "Windows",
    os: "windows",
    version: "0.1.0",
    architecture: "x64",
    packageTypes: ["NSIS", "ZIP"],
    status: "available",
    statusLabel: "预览可用",
    primaryActionLabel: "下载 Windows 版",
    downloadUrl: "#windows-download-pending",
    checksum: "待发布时填写 SHA256",
    size: "待发布",
    releaseDate: "2026-06-03",
    caveat: "当前仓库包含 Windows x64 aria2 运行资产。公开发布前建议完成签名与校验和记录。"
  },
  {
    platform: "macOS",
    os: "macos",
    version: "0.1.0",
    architecture: "arm64 / x64",
    packageTypes: ["DMG", "ZIP"],
    status: "preparing",
    statusLabel: "准备中",
    primaryActionLabel: "macOS 准备中",
    checksum: "待补齐",
    size: "待补齐",
    releaseDate: "待定",
    caveat:
      "macOS 公开分发前需要补齐 darwin-arm64 与 darwin-x64 aria2c 资产，并完成 Developer ID 签名与公证。"
  },
  {
    platform: "Linux",
    os: "linux",
    version: "0.1.0",
    architecture: "x64",
    packageTypes: ["AppImage", "tar.gz"],
    status: "available",
    statusLabel: "预览可用",
    primaryActionLabel: "下载 Linux 版",
    downloadUrl: "#linux-download-pending",
    checksum: "待发布时填写 SHA256",
    size: "待发布",
    releaseDate: "2026-06-03",
    caveat: "当前仓库包含 Linux x64 aria2 运行资产。发布包需要保持 aria2c 可执行权限。"
  }
];
