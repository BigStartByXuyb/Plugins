$ErrorActionPreference = 'Stop'
$pipeline = Join-Path $PSScriptRoot 'mastergo-dsl-pipeline.ps1'
$skill = Join-Path $PSScriptRoot '..\SKILL.md'
$root = Join-Path ([IO.Path]::GetTempPath()) "mastergo-dsl-pipeline-$([guid]::NewGuid().ToString('N'))"

function Assert-True {
    param([bool] $Condition, [string] $Message)
    if (-not $Condition) { throw "断言失败: $Message" }
}

function Invoke-Pipeline {
    param([string[]] $Arguments)
    & pwsh -NoProfile -File $pipeline @Arguments | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "pipeline action failed: $($Arguments -join ' ')" }
}

try {
    New-Item -ItemType Directory -Force -Path $root | Out-Null
    $overviewPath = Join-Path $root 'overview.json'
    $runDir = Join-Path $root 'run'
    [pscustomobject]@{
        fileId = 'file-1'
        layerId = 'layer-1'
        sections = @(
            [pscustomobject]@{ id = 's2'; name = '二'; nodeCount = 1 },
            [pscustomobject]@{ id = 's1'; name = '一'; nodeCount = 1 }
        )
    } | ConvertTo-Json -Depth 20 | Set-Content -LiteralPath $overviewPath -Encoding UTF8

    Invoke-Pipeline @('-Action', 'Init', '-Overview', $overviewPath, '-Out', $runDir, '-RunId', 'test-run')
    $manifest = Join-Path $runDir 'manifest.json'
    foreach ($id in @('s1', 's2')) {
        $input = Join-Path $root "$id.json"
        [pscustomobject]@{
            section = [pscustomobject]@{ id = $id; name = $id }
            dsl = [pscustomobject]@{ nodes = @([pscustomobject]@{ type = 'TEXT'; id = "node-$id"; text = $id }) }
            nodeCount = 1
        } | ConvertTo-Json -Depth 20 | Set-Content -LiteralPath $input -Encoding UTF8
        Invoke-Pipeline @('-Action', 'Write', '-Manifest', $manifest, '-SectionId', $id, '-InputFile', $input)
    }
    Invoke-Pipeline @('-Action', 'Merge', '-Manifest', $manifest)

    $snapshot = Get-Content -LiteralPath (Join-Path $runDir 'dsl.snapshot.json') -Raw | ConvertFrom-Json
    Assert-True (($snapshot.sections | ForEach-Object { $_.sectionId }) -join ',' -eq 's2,s1') '快照必须按 overview section 顺序合并'
    Assert-True ($snapshot.capturedNodeCount -eq 2) '快照节点数量必须完整'
    $coverage = Get-Content -LiteralPath (Join-Path $runDir 'coverage-report.json') -Raw | ConvertFrom-Json
    Assert-True ($coverage.status -eq 'complete') '覆盖校验必须通过'

    $skillText = Get-Content -LiteralPath $skill -Raw
    Assert-True ($skillText -match 'mastergo-dsl-pipeline\.ps1') 'Skill 必须引用 PowerShell DSL 流程'
    Assert-True ($skillText -match '5 个并发 worker') 'Skill 必须保留有界并发规则'
    Assert-True ($skillText -notmatch 'init-mastergo-dsl-run\.js|write-mastergo-dsl-section\.js|merge-mastergo-dsl\.js') 'Skill 不得引用 Node DSL 脚本'
    Write-Output 'PASS MasterGo DSL PowerShell pipeline test'
}
finally {
    if (Test-Path -LiteralPath $root) { Remove-Item -LiteralPath $root -Recurse -Force }
}

