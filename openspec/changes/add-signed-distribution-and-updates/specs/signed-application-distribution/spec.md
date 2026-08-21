## ADDED Requirements

### Requirement: 多平台发布产物

系统 SHALL 通过 electron-builder 为 Windows、macOS 和 Linux 生成可安装或可分发的产物，并同时生成 electron-updater 需要的版本元数据。

#### Scenario: 构建 Windows 发布包

- **WHEN** 发布流程在 Windows 运行
- **THEN** 系统生成 NSIS 安装包、ZIP 包及对应更新元数据

#### Scenario: 构建 macOS 发布包

- **WHEN** 发布流程在 macOS 运行
- **THEN** 系统生成 DMG、ZIP 包及对应更新元数据

#### Scenario: 构建 Linux 发布包

- **WHEN** 发布流程在 Linux 运行
- **THEN** 系统生成 AppImage、tar.gz 包及对应更新元数据

### Requirement: 安全注入代码签名凭据

发布流程 MUST 仅从 CI secrets 或进程环境读取代码签名和 Apple 公证凭据，且 MUST NOT 将证书、私钥或口令写入仓库产物。

#### Scenario: 有效凭据发布

- **WHEN** 平台发布 job 获得完整且有效的签名凭据
- **THEN** Windows/macOS 产物由相应平台证书签名，且 macOS 产物完成公证

#### Scenario: 本地无凭据打包

- **WHEN** 开发者显式禁用证书自动发现并运行本地打包
- **THEN** 系统可生成未签名的测试产物，且不要求将凭据保存到仓库

### Requirement: Tag 驱动的 GitHub 发布

系统 SHALL 在符合 `vX.Y.Z` 格式的 tag 被推送时验证 tag 与应用版本一致，构建所有目标平台并将产物发布到同一 GitHub Release。

#### Scenario: 发布一致版本

- **WHEN** `v0.2.0` tag 对应的 `package.json` 版本为 `0.2.0`
- **THEN** 发布流程构建多平台产物并上传到该 tag 的 Release

#### Scenario: 拒绝不一致版本

- **WHEN** tag 中的版本与 `package.json` 版本不一致
- **THEN** 发布流程在上传任何产物前失败
