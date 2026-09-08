# Marketplace CI/CD 调用说明

本仓库不保存完整 CI 实现。公共实现位于 [`BigStartByXuyb/cicd`](https://github.com/BigStartByXuyb/cicd)，并由根目录的 `.github/workflows/plugin-cicd.yml` 通过 reusable workflow `@v1` 调用。

插件贡献者只需要提交 `plugins/<plugin-name>/` 下的插件内容，不需要复制 CI 脚本、Claude CLI 或任何 API key。

DeepSeek 和飞书凭据由仓库维护者在公共 CI 仓库的受保护 Environment `plugin-cicd-prod` 中配置。凭据不得写入本仓库、PR、日志或 artifact。
