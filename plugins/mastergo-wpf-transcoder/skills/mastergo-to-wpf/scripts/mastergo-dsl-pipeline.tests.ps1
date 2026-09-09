$ErrorActionPreference = 'Stop'
$pipeline = Join-Path $PSScriptRoot 'mastergo-dsl-pipeline.ps1'
$skill = Join-Path $PSScriptRoot '..\SKILL.md'
$root = Join-Path ([IO.Path]::GetTempPath()) "mastergo-dsl-capture-$([guid]::NewGuid().ToString('N'))"

function Assert-True {
    param([bool] $Condition, [string] $Message)
    if (-not $Condition) { throw "断言失败: $Message" }
}

function Invoke-Capture {
    param([string[]] $Arguments)
    & pwsh -NoProfile -File $pipeline @Arguments | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "capture action failed: $($Arguments -join ' ')" }
}

try {
    New-Item -ItemType Directory -Force -Path $root | Out-Null
    $inputPath = Join-Path $root 'getDsl.json'
    $runDir = Join-Path $root 'run'
    [pscustomobject]@{
        dsl = [pscustomobject]@{
            styles = [pscustomobject]@{}
            nodes = @(
                [pscustomobject]@{
                    type = 'INSTANCE'
                    id = 'layer-1'
                    name = '整页'
                    layoutStyle = [pscustomobject]@{ width = 1280; height = 1024; relativeX = 0; relativeY = 0 }
                    children = @(
                        [pscustomobject]@{ type = 'TEXT'; id = 'node-1'; name = '标题'; text = @([pscustomobject]@{ text = '整页' }) }
                    )
                }
            )
            components = @()
        }
        componentDocumentLinks = @()
        rules = @('rule-1')
    } | ConvertTo-Json -Depth 20 | Set-Content -LiteralPath $inputPath -Encoding UTF8

    Invoke-Capture @(
        '-Action', 'Capture',
        '-InputFile', $inputPath,
        '-Out', $runDir,
        '-FileId', 'file-1',
        '-LayerId', 'layer-1',
        '-Ui', 'F2',
        '-RunId', 'test-run'
    )

    $snapshotPath = Join-Path $runDir 'dsl.snapshot.json'
    $snapshot = Get-Content -LiteralPath $snapshotPath -Raw | ConvertFrom-Json -Depth 100
    Assert-True ($snapshot.captureMode -eq 'mcp.getDsl') '快照必须记录一次性 getDsl 来源'
    Assert-True ($snapshot.layerId -eq 'layer-1') '快照必须保留根 layerId'
    Assert-True ($snapshot.nodeCount -eq 2) '快照节点数量必须完整'
    Assert-True (@($snapshot.dsl.nodes).Count -eq 1) '快照必须保留完整 DSL 根节点'
    Assert-True (@($snapshot.rules) -contains 'rule-1') '快照必须保留 MCP rules'

    $coverage = Get-Content -LiteralPath (Join-Path $runDir 'coverage-report.json') -Raw | ConvertFrom-Json -Depth 100
    Assert-True ($coverage.status -eq 'complete') '完整 DSL 覆盖校验必须通过'
    Assert-True ($null -eq $coverage.expectedNodeCount -and $coverage.capturedNodeCount -eq 2) '单响应覆盖必须记录实际节点数，不得伪造远端 expectedNodeCount'
    Assert-True ($coverage.validationBasis -eq 'single-response-structural-validation') '覆盖报告必须声明校验口径'
    Assert-True (@(Get-ChildItem -LiteralPath $runDir -File).Count -eq 4) '一次性捕获只应生成四份审计文件'
    Assert-True (-not (Test-Path -LiteralPath (Join-Path $runDir 'sections'))) '不得生成 section 目录'
    Assert-True (-not (Test-Path -LiteralPath (Join-Path $runDir 'status'))) '不得生成 section status 目录'
    Assert-True (-not (Test-Path -LiteralPath (Join-Path $runDir 'retry-manifest.json'))) '不得生成 section 重试清单'

    $skillText = Get-Content -LiteralPath $skill -Raw
    Assert-True ($skillText -match 'getDsl') 'Skill 必须强制使用一次性 getDsl'
    Assert-True ($skillText -match 'Capture') 'Skill 必须引用单次捕获流程'
    Assert-True ($skillText -notmatch 'getDesignSections') 'Skill 不得继续引用分段总览接口'
    Assert-True ($skillText -notmatch 'sectionIndex|retry-manifest|Init.*Write.*Merge') 'Skill 不得保留分段采集语义'
    Write-Output 'PASS MasterGo single-response DSL capture pipeline test'
}
finally {
    if (Test-Path -LiteralPath $root) { Remove-Item -LiteralPath $root -Recurse -Force }
}
