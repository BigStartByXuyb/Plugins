# MasterGo WPF 转码插件

用于将 MasterGo 设计稿转换为 MW WPF/XAML 和 MTSLG IOContorl XML 的 Claude Code 插件。

## Included skills

- `skills/mastergo-to-wpf/` — 转码流程、组件映射参考、MTSLG 来源验证和坐标回归检查。
- `skills/mastergo-iocontrol-document-format/` — 编写和审查 MasterGo → MTSLG IOContorl 映射文档的统一格式规范。

完整页面转换分为两个强制阶段：

- `skills/mastergo-to-wpf/scripts/mastergo-dsl-pipeline.ps1` — 管理 MasterGo 总览、逐 section DSL 快照、覆盖校验和失败重试；只有覆盖报告为 `complete` 才能继续生成。
- `skills/mastergo-to-wpf/scripts/resolve-mastergo-visibility.js` — 从 DSL 机械提取节点可见属性、祖先继承后的有效可见状态、TEXT/PATH 索引和可见性来源；只生成 visibility audit，不直接生成 mapping。
- `skills/mastergo-to-wpf/scripts/gen-mastergo-page-bundle.js` — 接收已确认的页面 mapping，统一生成页面 XML、Icon、Layout、WPF 宿主和审计产物。

Layout 增量注册与 `--overwrite` 的语义：

- 新增一个尚不存在的 `Page Target`：允许增量写入已有 Layout，并在覆盖前创建备份；
- 替换已有的同名 `Page Target`：必须显式传入 `--overwrite`；
- 页面 XML、Icon 和 WPF 宿主文件已存在时：必须显式传入 `--overwrite`。

页面可以没有任何运行时 Icon。Bundle 不以 PATH 候选数量或 Geometry 数量判断页面是否需要图标；只有 IOContorl 节点或 Layout 菜单实际引用了 Icon 时，才要求对应 Geometry 已生成。

Agent 的完整工作流是：MasterGo MCP 总览 → DSL pipeline `Init/Write/Merge` → coverage complete → 组件映射 → page bundle。DSL pipeline 不负责猜测控件、资源键或运行时业务绑定。

可见性脚本的输出是 AI 映射的事实输入，不是最终页面文件。AI 仍需结合原始 DSL、visibility audit、正式组件映射和目标运行时资料生成 mapping；mapping 再由 Bundle 生成 XML、Icon、Layout 和宿主文件。

没有目标项目时也生成完整项目脚手架：`.csproj`、`framework.config.json`、WPF 宿主、页面 XML、Icon 资源容器、Layout 壳层、mapping/provenance 和待配置清单都必须存在；只跳过编译、WPF 加载和真实运行时验证。脚手架与正式项目使用同一套页面生成结构。

## Claude Code 安装

从仓库根目录通过 Claude Code 的本地插件或 marketplace 流程安装。插件清单位于 `.claude-plugin/plugin.json`；Claude Code 会自动发现 `skills/` 下的两个独立 Skill。

## 本地验证

```powershell
node skills/mastergo-to-wpf/scripts/check-iocontrol-coords.test.js
node skills/mastergo-to-wpf/scripts/validate-iocontrol-provenance.test.js
```

Skill 中包含项目专用的 MW/MTSLG 规则。分享给其他团队前，请先检查参考资料，并根据实际项目调整路径和运行时集成方式。
