# MasterGo WPF Transcoder

Claude Code plugin for converting MasterGo designs into MW WPF/XAML and MTSLG IOContorl XML.

## Included skill

- `skills/mastergo-to-wpf/` — conversion workflow, component mapping references, MTSLG provenance validation, and coordinate regression checks.

## Claude Code installation

Install the plugin from the repository root with Claude Code's local plugin or marketplace workflow. The plugin manifest is at `.claude-plugin/plugin.json`; Claude Code discovers the skill under `skills/`.

## Local verification

```powershell
node skills/mastergo-to-wpf/scripts/check-iocontrol-coords.test.js
node skills/mastergo-to-wpf/scripts/validate-iocontrol-provenance.test.js
```

The skill contains project-specific MW/MTSLG rules. Review the references and adapt project paths or runtime integrations before sharing it with another team.
