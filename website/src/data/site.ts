export const site = {
  name: "Tide X",
  version: "0.1.0",
  description: "内置 aria2 的桌面下载管理器",
  longDescription:
    "无需手动安装、配置或操作 aria2。Tide X 在本地管理下载引擎、任务队列、速度限制和会话恢复，让多协议下载变成清晰的桌面工作流。",
  repositoryUrl: "https://github.com/example/tide-x",
  docsUrl: "https://github.com/example/tide-x/tree/main/docs",
  primaryCta: {
    label: "下载 Windows 版",
    href: "/download/"
  },
  secondaryCta: {
    label: "查看更新记录",
    href: "/changelog/"
  }
};

export const navigation = [
  { label: "首页", href: "/" },
  { label: "下载", href: "/download/" },
  { label: "更新记录", href: "/changelog/" },
  { label: "关于", href: "/about/" }
];

export const principles = [
  {
    title: "本地优先",
    description: "下载引擎、任务状态和设置保留在本机，Tide X 不需要云端账户才能完成核心下载工作。"
  },
  {
    title: "托管 aria2，而不是暴露 aria2",
    description: "主进程负责启动本地 aria2 RPC、保存密钥并归一化错误，网站与渲染层都不直接暴露远程控制入口。"
  },
  {
    title: "只做下载管理",
    description: "Tide X 不提供内容发现、资源站聚合或版权内容推荐，产品边界保持清楚。"
  }
];

export const openSourceInfo = {
  title: "开源信息",
  description:
    "Tide X 计划以开放源码方式维护桌面下载器、网站和发布说明，让功能实现、发布限制与第三方运行时来源都能被追踪。",
  repositoryLabel: "项目仓库",
  repositoryUrl: "https://github.com/example/tide-x",
  licenseLabel: "许可",
  licenseValue: "待仓库公开时以 LICENSE 文件为准",
  stack: ["Electron", "React", "Astro", "aria2", "TypeScript"],
  cards: [
    {
      title: "源码透明",
      description:
        "桌面端、官网和 OpenSpec 变更文档放在同一仓库中，功能范围、实现任务和发布状态可以一起审阅。"
    },
    {
      title: "依赖可追踪",
      description:
        "下载核心来自 aria2c，相关二进制、许可文本和 notices 保留在 resources/aria2 下，更新时需要同步验证。"
    },
    {
      title: "发布诚实",
      description:
        "下载页会明确区分可用、准备中和待补齐的平台，不把缺失签名、公证或校验和的 artifact 包装成正式发布。"
    }
  ]
};
