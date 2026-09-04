# MasterGo WPF 转码插件

用于将 MasterGo 设计稿转换为 MW WPF/XAML 和 MTSLG IOContorl XML 的 Claude Code 插件。

## Included skills

- `skills/mastergo-to-wpf/` — 转码流程、组件映射参考、MTSLG 来源验证和坐标回归检查。
- `skills/mastergo-iocontrol-document-format/` — 编写和审查 MasterGo → MTSLG IOContorl 映射文档的统一格式规范。

## Claude Code 安装

从仓库根目录通过 Claude Code 的本地插件或 marketplace 流程安装。插件清单位于 `.claude-plugin/plugin.json`；Claude Code 会自动发现 `skills/` 下的两个独立 Skill。

## 本地验证

```powershell
node skills/mastergo-to-wpf/scripts/check-iocontrol-coords.test.js
node skills/mastergo-to-wpf/scripts/validate-iocontrol-provenance.test.js
```

Skill 中包含项目专用的 MW/MTSLG 规则。分享给其他团队前，请先检查参考资料，并根据实际项目调整路径和运行时集成方式。
