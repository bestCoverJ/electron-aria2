## ADDED Requirements

### Requirement: 用户只看到稳定错误码

系统 MUST NOT 在渲染进程显示更新异常堆栈、URL headers 或原始响应，并 SHALL 显示稳定错误码与简短处理建议。

#### Scenario: 更新元数据 404

- **WHEN** updater 因 latest.yml 不存在而失败
- **THEN** 界面显示如 `UPD-002` 的错误码和重试建议，不显示原始 URL/header

### Requirement: 更新详细日志持久化

系统 SHALL 将完整更新异常追加到本地日志文件，并 SHALL 对日志设置有界轮转。

#### Scenario: 连续更新失败

- **WHEN** 更新检查多次失败
- **THEN** 每次错误均带时间和错误码写入 `userData/logs/updater.log`，文件超限时轮转
