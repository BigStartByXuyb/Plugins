---
name: agent-plugin-publisher
description: 将用户明确指定的本地目录按团队统一格式打包为插件。用户说“打包成 plugin”“打包插件”“发布插件”“上传插件”，或要求把 skill、MCP、subagent、脚本或资源制作成可分发插件时，必须使用本 Skill；不用于单独创建 Skill、普通文件整理或仅讨论插件概念。
---

# 团队插件打包发布

本 Skill 是插件发布的强制入口。团队统一格式与 Claude Code 插件包格式**完全一致**：使用 `.claude-plugin/plugin.json` 与 Claude Code 规定的根级组件目录结构。团队选择这套格式作为不同 Agent 的统一分发协议，**不是**将插件限定为只给 Claude Code 使用。

不得改用 Codex 专用 `.codex-plugin/` 格式，也不得根据当前调用 Agent 擅自切换协议。只有用户明确要求另一种目标协议时，才停止并请其确认该需求是否取代团队默认格式。

## 必须先确认源目录、staging 目录和目标仓库

1. 扫描或复制前，必须要求用户明确源文件夹；若请求涉及多个文件夹，询问哪些在本次范围内。
2. 目标仓库可以是本地 checkout 路径，也可以是 GitHub/GitLab 仓库 URL。先确认当前会话能够读取目标仓库、既有插件内容，以及用于团队统一协议的参考插件。
3. 用户只提供仓库 URL 时，建立隔离的临时浅层、稀疏 checkout，只读取冲突检查与协议检查所需的文件；不得拉取完整历史或无关目录。记录远程 URL、分支/ref 与 checkout 的提交。若网络读取失败，但存在指向同一远程 URL 的本地 checkout，可仅将其用作只读审计依据，并明确报告远端未刷新；不得把它当作正式发布工作区。
4. 确认目标仓库的团队协议仍是 `.claude-plugin/plugin.json` 加根级组件目录。若参考插件与此不一致，报告实际情况并请用户确认新的团队协议，不能自行猜测。
5. 默认 staging 目录为 `%USERPROFILE%\plugins\<规范化插件名>\`；若用户指定了其他本地打包目录，使用其指定目录。staging 目录不是正式仓库，不得在未确认发布前写入目标仓库。
6. 如果无法从源目录及目标仓库约定中无歧义地得出插件名、staging 目录或正式目标目录，必须向用户确认。
7. 除非用户明确指定，不得把工作区根目录、用户主目录或递归搜索碰巧找到的目录当作源目录。

## 先做插件冲突与相似度检查

生成任何文件前，读取目标仓库中所有已有插件的 `.claude-plugin/plugin.json`，并在存在时读取 marketplace 条目：

1. 将候选插件名按仓库命名规则规范化后，与已有插件名及 marketplace 名称做不区分大小写的精确比较。
2. 若名称冲突，停止，不得覆盖或合并。向用户展示冲突插件的路径和简介，并要求用户明确选择更新该插件、改名，或取消。
3. 用候选插件的名称、简介、关键词，以及识别到的 skill 名称/简介，与已有插件的同类信息做相似度检查。
4. 若发现功能可能重复或高度相似的候选项，必须在生成前提醒用户，列出候选插件、相似依据和路径；相似度仅是提醒，不能自动判定为冲突。等待用户明确选择继续新增、改为扩展已有插件，或修改名称/简介。
5. 未发现精确冲突或相似候选项时，也要在内容清单中明确报告检查范围与结果。

## 修改前先建立内容清单

创建或修改插件前，只扫描已确认的源目录，并报告简明清单。必须根据文件证据分类：

| 文件证据 | 类型 | 团队协议目标位置 |
| --- | --- | --- |
| 带 YAML frontmatter 的 `SKILL.md` | Skill | `skills/<skill-name>/` |
| `commands/*.md` | Command（兼容旧式平铺命令） | `commands/` |
| `agents/*.md` 或用户明确确认的 agent 定义 | Subagent | `agents/` |
| `.mcp.json` 或已确认的 MCP 服务配置 | MCP | 根目录 `.mcp.json` |
| `hooks/hooks.json`、附加 hook JSON，或 Skill/agent frontmatter 中的 `hooks` | Hook | `hooks/` 或组件自身 frontmatter |
| `.lsp.json` | LSP 服务 | 根目录 `.lsp.json` |
| `monitors/monitors.json` | 后台监控 | `monitors/` |
| `output-styles/` | 输出风格 | `output-styles/` |
| `themes/` | 主题 | `themes/` |
| `bin/` | 可执行文件 | `bin/` |
| `settings.json` | 插件默认设置 | 根目录 `settings.json` |
| `scripts/`、`assets/`、`references/`、模板及被 skill 引用的文件 | 支撑资源 | 在所属组件下保留相对归属 |

不得仅凭目录名称分类。对于含义不明或暂不支持的文件，必须单独列出并询问用户如何处理；不得静默丢弃。

## 按团队统一格式打包插件

1. 仅在 staging 目录 `%USERPROFILE%\plugins\<规范化插件名>\` 中创建或更新插件；默认保留源目录不动。
2. 在 staging 目录中使用仓库已有的 metadata 形式创建 `.claude-plugin/plugin.json`。例如，已有仓库使用 `name`、`description`、`version`、`author`、`keywords`、`license` 时，沿用该字段形式。只根据源文件和用户请求填写可证明的信息；无法确定的必要身份字段必须询问用户。
3. 将已确认的组件复制到团队协议的目标位置，并保持内部相对引用有效。不得为了迎合猜测出的结构而重写 Skill 内容、脚本逻辑或相对路径；如复制会造成引用失效，先报告影响并等待用户确认修复方式。只有用户明确要求整理源目录时，才可以移动或删除源文件。
4. 除 `plugin.json` 外，`SKILL.md`、`commands/`、`agents/`、`hooks/`、`output-styles/`、`themes/`、`monitors/`、`bin/`、`.mcp.json`、`.lsp.json`、`settings.json`、脚本与资源都必须位于 `.claude-plugin/` 之外。
5. 禁止把凭据、Token 或机器专属秘密写进插件。MCP、LSP、hook 与 monitor 配置只能保留环境变量引用，不能写入秘密值。
6. 静态打包与校验阶段不得执行 hook、monitor、MCP、LSP 或 `bin/` 中的程序。只检查其结构、JSON/Markdown 语法、文件存在性和插件内相对路径。

## 验证、发布与来源清理

1. 只在 staging 目录完成静态校验。若本机有可用的兼容 CLI，运行其插件验证命令；否则完成静态校验并明确报告未做运行时加载验证。
2. 向用户展示 staging 路径、内容清单、冲突与相似度检查结果、校验结果和变更文件。默认到此停止。
3. 只有用户明确确认“发布到仓库”后，才将已验证的 staging 插件复制到目标仓库 `plugins/<插件名>/`，并按仓库惯例更新 marketplace metadata。Git commit、推送、tag 或远程 marketplace 发布仍需要用户在同一任务中单独明确要求。
4. 正式插件已安装并验证加载后，检查同一 Agent 是否仍从原始位置发现重复的 skill、MCP、subagent、hook 或其他组件。报告每个重复来源及影响。
5. 默认不删除、移动或注销原始来源。只有用户针对列出的重复项明确确认后，才按组件分别处理：移除旧注册、移动到可恢复归档目录，或删除源文件。处理 MCP 时先确认插件版本可连接，且只移除重复配置，不删除环境变量中的凭据。

## 校验与交付

在声称插件可用前，必须完成以下校验：

- `plugin.json` 是合法 JSON，具有预期团队协议 metadata，并且位于 `.claude-plugin/plugin.json`。
- 每个识别出的 skill 都有带合法 frontmatter 的 `SKILL.md`；每个本地引用的文件都存在于插件目录内。
- command、MCP、agent、hook、LSP、monitor、输出风格、主题、settings 与 marketplace 文件语法合法，且位于团队协议约定的位置。
- 最终目录树与修改前清单一致；报告每一个被刻意排除或仍未解决的文件。

交付时展示 staging 目录、简明内容清单、冲突与相似度检查结果、校验结果和改动文件。默认在本地生成与校验后停止。
