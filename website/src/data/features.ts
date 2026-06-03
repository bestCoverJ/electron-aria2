export const heroStats = [
  { value: "4", label: "输入类型" },
  { value: "7", label: "任务状态" },
  { value: "3", label: "桌面平台" }
];

export const coreFeatures = [
  {
    number: "01",
    title: "内置 aria2 运行时",
    description:
      "Tide X 随应用打包 aria2c，启动时自动管理本地 RPC、密钥、会话文件和健康状态，普通用户无需单独配置命令行工具。"
  },
  {
    number: "02",
    title: "多协议任务创建",
    description:
      "支持 HTTP/HTTPS 链接、Torrent 文件、Magnet 链接和 Metalink 输入，并在提交前进行基础验证。"
  },
  {
    number: "03",
    title: "清晰的任务控制",
    description:
      "暂停、恢复、删除、重试、打开文件位置和查看详情都沉在桌面工作流里，状态不会被 aria2 的底层术语淹没。"
  }
];

export const detailFeatures = [
  "实时进度、速度、剩余时间和总大小",
  "任务队列、并发数、连接数和速度限制",
  "多文件任务的文件列表与选择状态",
  "失败原因归一化为用户可读信息",
  "设置、任务元数据和会话恢复",
  "托盘菜单、完成通知和失败通知"
];

export const workflow = [
  {
    number: "01",
    title: "添加",
    description: "粘贴链接或选择 Torrent/Metalink，Tide X 负责识别输入并应用默认下载目录。"
  },
  {
    number: "02",
    title: "监控",
    description: "在列表和详情面板中查看进度、速度、文件、连接数和错误信息。"
  },
  {
    number: "03",
    title: "恢复",
    description: "重启后通过 aria2 会话与本地元数据恢复正在进行的任务。"
  }
];
