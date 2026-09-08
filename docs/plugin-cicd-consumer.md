# Marketplace CI/CD 调用说明

本仓库不保存完整 CI 实现。公共实现位于团队 GitHub Organization 下的
`cicd` 仓库，并由根目录的 `.github/workflows/plugin-cicd.yml` 通过固定的已审核 commit SHA 调用。

调用方与 `cicd` 必须属于同一个 GitHub Organization。插件贡献者只需要提交
`plugins/<plugin-name>/` 下的插件内容，不需要复制 CI 脚本、Claude CLI 或任何 API key。

仓库维护者在 Organization Settings → Secrets and variables → Actions 中配置并按仓库
allow-list 授权以下五个 Organization Secrets：

```text
ANTHROPIC_API_KEY
FEISHU_APP_ID
FEISHU_APP_SECRET
FEISHU_DEFAULT_CHAT_ID
FEISHU_RECIPIENT_MAP_JSON
```

根目录调用工作流必须把这五个 Secret 显式映射给可复用 workflow；不要使用
`secrets: inherit`。Secret 值不得写入本仓库、PR、日志或 artifact。

当前仓库尚在个人账号下时，工作流中的 owner 仍可暂时写为 `BigStartByXuyb`；完成
Organization 迁移后，必须把 `uses:` 中的 owner 改为最终 Organization slug，并重新审核和锁定 commit SHA。
