param(
    [Parameter(Mandatory = $true)]
    [ValidateSet('Init', 'Write', 'Merge')]
    [string] $Action,

    [string] $Overview,
    [string] $Out,
    [string] $Manifest,
    [string] $SectionId,
    [string] $InputFile,
    [int] $Attempt = 1,
    [string] $Ui = 'F2',
    [string] $RunId
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Write-AtomicJson {
    param([string] $Path, [object] $Value)
    $parent = Split-Path -Parent $Path
    if ($parent) { New-Item -ItemType Directory -Force -Path $parent | Out-Null }
    $temp = "$Path.tmp-$PID-$([DateTime]::UtcNow.Ticks)"
    $Value | ConvertTo-Json -Depth 100 | Set-Content -LiteralPath $temp -Encoding UTF8
    Move-Item -LiteralPath $temp -Destination $Path -Force
}

function Read-JsonFile {
    param([string] $Path, [string] $Label = 'JSON')
    try { return (Get-Content -LiteralPath $Path -Raw -Encoding UTF8 | ConvertFrom-Json) }
    catch { throw "$Label 读取失败: $($_.Exception.Message)" }
}

function Get-RunId {
    return "$(Get-Date -Format 'yyyyMMddHHmmss')-$([guid]::NewGuid().ToString('N').Substring(0, 8))"
}

function Get-SectionFileName {
    param([string] $Id)
    return "$([uri]::EscapeDataString($Id)).json"
}

function Get-NodeRefs {
    param([object[]] $Nodes, [System.Collections.Generic.List[object]] $Records, [string] $ParentRef, [string] $CurrentSectionId)
    foreach ($node in @($Nodes)) {
        if ($null -eq $node) { continue }
        $ref = if ($node.PSObject.Properties.Name -contains 'id' -and [string] $node.id) { [string] $node.id } else { $null }
        $effectiveParent = if ($node.PSObject.Properties.Name -contains 'parentRef' -and [string] $node.parentRef) { [string] $node.parentRef } else { $ParentRef }
        if ($ref) {
            $Records.Add([pscustomobject]@{ ref = $ref; sectionId = $CurrentSectionId; parentRef = $effectiveParent })
        }
        $children = if ($node.PSObject.Properties.Name -contains 'children') { $node.children } else { @() }
        Get-NodeRefs -Nodes @($children) -Records $Records -ParentRef $(if ($ref) { $ref } else { $effectiveParent }) -CurrentSectionId $CurrentSectionId
    }
}

function Get-NumberOrNull {
    param([object] $Value)
    if ($null -eq $Value -or "$Value" -eq '') { return $null }
    $number = 0.0
    if ([double]::TryParse("$Value", [Globalization.NumberStyles]::Any, [Globalization.CultureInfo]::InvariantCulture, [ref] $number)) {
        return $number
    }
    return $null
}

function Initialize-Run {
    if (-not $Overview -or -not $Out) { throw 'Init 必须提供 -Overview 和 -Out' }
    $overviewPath = (Resolve-Path -LiteralPath $Overview).Path
    $overviewObject = Read-JsonFile -Path $overviewPath -Label 'overview'
    if (-not $overviewObject.fileId) { throw 'overview.fileId 缺失' }
    if (-not $overviewObject.layerId) { throw 'overview.layerId 缺失' }
    if (-not ($overviewObject.sections -is [System.Collections.IEnumerable]) -or @($overviewObject.sections).Count -eq 0) { throw 'overview.sections 必须是非空数组' }

    $seen = [System.Collections.Generic.HashSet[string]]::new()
    $sections = [System.Collections.Generic.List[object]]::new()
    $index = 0
    foreach ($section in @($overviewObject.sections)) {
        $sectionId = if ($section.PSObject.Properties.Name -contains 'id') { [string] $section.id } else { [string] $section.sectionId }
        if (-not $sectionId) { throw "sections[$index] 缺少 id/sectionId" }
        if (-not $seen.Add($sectionId)) { throw "section ID 重复: $sectionId" }
        $sections.Add([pscustomobject]@{
            index = $index
            sectionId = $sectionId
            name = if ($section.PSObject.Properties.Name -contains 'name') { $section.name } else { $null }
            expectedNodeCount = Get-NumberOrNull $(if ($section.PSObject.Properties.Name -contains 'nodeCount') { $section.nodeCount } else { $null })
            status = 'pending'
            attempts = 0
        })
        $index++
    }

    New-Item -ItemType Directory -Force -Path $Out | Out-Null
    $runDir = (Resolve-Path -LiteralPath $Out).Path
    New-Item -ItemType Directory -Force -Path (Join-Path $runDir 'sections'), (Join-Path $runDir 'status') | Out-Null

    $hasCounts = @($sections | Where-Object { $null -eq $_.expectedNodeCount }).Count -eq 0
    $expectedNodeCount = if ($hasCounts) { (@($sections | Measure-Object -Property expectedNodeCount -Sum).Sum) } else { Get-NumberOrNull $(if ($overviewObject.PSObject.Properties.Name -contains 'totalNodes') { $overviewObject.totalNodes } else { $null }) }
    $pageName = $null
    if ($overviewObject.PSObject.Properties.Name -contains 'pageName') { $pageName = $overviewObject.pageName }
    elseif ($overviewObject.PSObject.Properties.Name -contains 'rootMetadata' -and $overviewObject.rootMetadata) { $pageName = $overviewObject.rootMetadata.name }
    $manifestObject = [pscustomobject]@{
        schemaVersion = 'mastergo-dsl-run/1'
        runId = if ($RunId) { $RunId } else { Get-RunId }
        fileId = [string] $overviewObject.fileId
        layerId = [string] $overviewObject.layerId
        pageName = $pageName
        ui = $Ui
        startedAt = [DateTime]::UtcNow.ToString('o')
        expectedSectionCount = $sections.Count
        expectedNodeCount = $expectedNodeCount
        sections = @($sections)
    }
    Write-AtomicJson -Path (Join-Path $runDir 'overview.json') -Value $overviewObject
    Write-AtomicJson -Path (Join-Path $runDir 'manifest.json') -Value $manifestObject
    [pscustomobject]@{ outDir = $runDir; runId = $manifestObject.runId; ui = $manifestObject.ui; expectedSectionCount = $sections.Count } | ConvertTo-Json
}

function Write-Section {
    if (-not $Manifest -or -not $SectionId -or -not $InputFile) { throw 'Write 必须提供 -Manifest、-SectionId 和 -InputFile' }
    if ($Attempt -lt 1) { throw 'Attempt 必须是正整数' }
    $manifestPath = (Resolve-Path -LiteralPath $Manifest).Path
    $manifestObject = Read-JsonFile -Path $manifestPath -Label 'manifest'
    $task = @($manifestObject.sections | Where-Object { $_.sectionId -eq $SectionId }) | Select-Object -First 1
    if ($null -eq $task) { throw "section ID 不在 manifest 中: $SectionId" }
    $runDir = Split-Path -Parent $manifestPath
    $sectionPath = Join-Path (Join-Path $runDir 'sections') (Get-SectionFileName $SectionId)
    $statusPath = Join-Path (Join-Path $runDir 'status') (Get-SectionFileName $SectionId)
    $startedAt = [DateTime]::UtcNow
    try {
        $payload = Read-JsonFile -Path ((Resolve-Path -LiteralPath $InputFile).Path) -Label 'section response'
        $actualId = if ($payload.section.id) { [string] $payload.section.id } else { [string] $payload.section.sectionId }
        if ($actualId -ne $SectionId) { throw "section ID 不匹配：期望 $SectionId，实际 $actualId" }
        if (-not $payload.dsl -or $null -eq $payload.dsl.nodes) { throw '响应缺少 dsl.nodes[]，拒绝写入不完整快照' }
        $records = [System.Collections.Generic.List[object]]::new()
        Get-NodeRefs -Nodes @($payload.dsl.nodes) -Records $records -ParentRef $null -CurrentSectionId $SectionId
        $refs = @($records | ForEach-Object { $_.ref })
        if (@($refs | Sort-Object -Unique).Count -ne $refs.Count) { throw 'section 内 node ref 重复' }
        Write-AtomicJson -Path $sectionPath -Value $payload
        $finishedAt = [DateTime]::UtcNow
        Write-AtomicJson -Path $statusPath -Value ([pscustomobject]@{
            schemaVersion = 'mastergo-dsl-section-status/1'; runId = $manifestObject.runId; sectionId = $SectionId; attempt = $Attempt; status = 'success'; startedAt = $startedAt.ToString('o'); finishedAt = $finishedAt.ToString('o'); durationMs = [int]($finishedAt - $startedAt).TotalMilliseconds; nodeCount = if ($null -ne $payload.nodeCount) { [int] $payload.nodeCount } else { $records.Count }
        })
        [pscustomobject]@{ sectionId = $SectionId; status = 'success'; attempt = $Attempt } | ConvertTo-Json
    } catch {
        $finishedAt = [DateTime]::UtcNow
        Write-AtomicJson -Path $statusPath -Value ([pscustomobject]@{
            schemaVersion = 'mastergo-dsl-section-status/1'; runId = $manifestObject.runId; sectionId = $SectionId; attempt = $Attempt; status = 'failed'; startedAt = $startedAt.ToString('o'); finishedAt = $finishedAt.ToString('o'); durationMs = [int]($finishedAt - $startedAt).TotalMilliseconds; error = $_.Exception.Message
        })
        throw
    }
}

function Merge-Run {
    if (-not $Manifest) { throw 'Merge 必须提供 -Manifest' }
    $manifestPath = (Resolve-Path -LiteralPath $Manifest).Path
    $manifestObject = Read-JsonFile -Path $manifestPath -Label 'manifest'
    $runDir = Split-Path -Parent $manifestPath
    $loaded = [System.Collections.Generic.List[object]]::new()
    $missing = [System.Collections.Generic.List[string]]::new()
    $failed = [System.Collections.Generic.List[string]]::new()
    $invalid = [System.Collections.Generic.List[object]]::new()
    $retry = [System.Collections.Generic.List[object]]::new()
    $workerDurations = [System.Collections.Generic.List[double]]::new()
    $sectionTimes = [System.Collections.Generic.List[datetime]]::new()
    foreach ($task in @($manifestObject.sections)) {
        $filePath = Join-Path (Join-Path $runDir 'sections') (Get-SectionFileName $task.sectionId)
        $statusPath = Join-Path (Join-Path $runDir 'status') (Get-SectionFileName $task.sectionId)
        if (-not (Test-Path -LiteralPath $filePath) -or -not (Test-Path -LiteralPath $statusPath)) { $missing.Add($task.sectionId); $retry.Add([pscustomobject]@{ sectionId = $task.sectionId; index = $task.index; reason = 'missing' }); continue }
        $sectionStatus = Read-JsonFile -Path $statusPath -Label 'section status'
        if ($sectionStatus.status -ne 'success') { $failed.Add($task.sectionId); $retry.Add([pscustomobject]@{ sectionId = $task.sectionId; index = $task.index; reason = 'failed'; error = $sectionStatus.error }); continue }
        if ($sectionStatus.startedAt) { $sectionTimes.Add([datetime] $sectionStatus.startedAt) }
        if ($sectionStatus.finishedAt) { $sectionTimes.Add([datetime] $sectionStatus.finishedAt) }
        $workerDurations.Add([double] $sectionStatus.durationMs)
        try {
            $payload = Read-JsonFile -Path $filePath -Label 'section snapshot'
            $actualId = if ($payload.section.id) { [string] $payload.section.id } else { [string] $payload.section.sectionId }
            if ($actualId -ne $task.sectionId) { throw 'id-mismatch' }
            if (-not $payload.dsl -or $null -eq $payload.dsl.nodes) { throw 'invalid-json' }
            $records = [System.Collections.Generic.List[object]]::new()
            Get-NodeRefs -Nodes @($payload.dsl.nodes) -Records $records -ParentRef $null -CurrentSectionId $task.sectionId
            if ($null -ne $payload.nodeCount -and [int] $payload.nodeCount -ne $records.Count) { throw 'node-count-mismatch' }
            $loaded.Add([pscustomobject]@{ task = $task; payload = $payload; records = $records; status = $sectionStatus })
        } catch {
            $reason = $_.Exception.Message
            $invalid.Add([pscustomobject]@{ sectionId = $task.sectionId; reason = $reason })
            $retry.Add([pscustomobject]@{ sectionId = $task.sectionId; index = $task.index; reason = $reason })
        }
    }
    $seen = @{}
    $duplicate = [System.Collections.Generic.HashSet[string]]::new()
    $unknownParent = [System.Collections.Generic.HashSet[string]]::new()
    foreach ($section in $loaded) { foreach ($record in $section.records) { if ($seen.ContainsKey($record.ref)) { $duplicate.Add($record.ref) | Out-Null } else { $seen[$record.ref] = $record.sectionId } } }
    foreach ($section in $loaded) { foreach ($record in $section.records) { if ($record.parentRef -and -not $seen.ContainsKey($record.parentRef)) { $unknownParent.Add($record.parentRef) | Out-Null } } }
    $capturedNodeCount = [int](@($loaded | ForEach-Object { $_.records.Count } | Measure-Object -Sum).Sum)
    $mismatch = @($loaded | ForEach-Object { if ($null -ne $_.task.expectedNodeCount -and [int] $_.task.expectedNodeCount -ne $_.records.Count) { [pscustomobject]@{ sectionId = $_.task.sectionId; expected = [int] $_.task.expectedNodeCount; actual = $_.records.Count } } })
    foreach ($item in $mismatch) { if (-not @($retry | Where-Object { $_.sectionId -eq $item.sectionId })) { $task = @($manifestObject.sections | Where-Object { $_.sectionId -eq $item.sectionId })[0]; $retry.Add([pscustomobject]@{ sectionId = $item.sectionId; index = $task.index; reason = 'source-node-count-mismatch' }) } }
    $allHaveCounts = @($manifestObject.sections | Where-Object { $null -eq $_.expectedNodeCount }).Count -eq 0
    $expectedNodeCount = if ($allHaveCounts) { [int](@($manifestObject.sections | ForEach-Object { [int] $_.expectedNodeCount } | Measure-Object -Sum).Sum) } elseif ($null -ne $manifestObject.expectedNodeCount) { [int] $manifestObject.expectedNodeCount } else { $null }
    $status = if ($missing.Count -or $failed.Count -or $invalid.Count -or $mismatch.Count -or $duplicate.Count -or $unknownParent.Count) { 'incomplete' } else { 'complete' }
    $checkedAt = [DateTime]::UtcNow
    $coverage = [pscustomobject]@{ schemaVersion = 'mastergo-dsl-coverage/1'; runId = $manifestObject.runId; status = $status; expectedSectionCount = @($manifestObject.sections).Count; successfulSectionCount = $loaded.Count; missing = @($missing); failed = @($failed); invalid = @($invalid); expectedNodeCount = $expectedNodeCount; capturedNodeCount = $capturedNodeCount; sourceNodeCountMismatch = @($mismatch); duplicateNodeRefs = @($duplicate | Sort-Object); unknownParentRefs = @($unknownParent | Sort-Object); checkedAt = $checkedAt.ToString('o') }
    Write-AtomicJson -Path (Join-Path $runDir 'coverage-report.json') -Value $coverage
    $sectionWallClock = if ($sectionTimes.Count -ge 2) { [int](($sectionTimes | Measure-Object -Maximum).Maximum - ($sectionTimes | Measure-Object -Minimum).Minimum).TotalMilliseconds } else { 0 }
    Write-AtomicJson -Path (Join-Path $runDir 'timing.json') -Value ([pscustomobject]@{ schemaVersion = 'mastergo-dsl-timing/1'; runId = $manifestObject.runId; totalWallClockMs = if ($manifestObject.startedAt) { [int]($checkedAt - [datetime] $manifestObject.startedAt).TotalMilliseconds } else { 0 }; overviewMs = 0; sectionWallClockMs = $sectionWallClock; sectionWorkerDurationMs = [int](@($workerDurations | Measure-Object -Sum).Sum); mergeMs = 0; validationMs = 0; criticalPathMs = $sectionWallClock; completedAt = $checkedAt.ToString('o') })
    $snapshotPath = Join-Path $runDir 'dsl.snapshot.json'
    if ($status -ne 'complete') {
        if (Test-Path -LiteralPath $snapshotPath) { Remove-Item -LiteralPath $snapshotPath -Force }
        Write-AtomicJson -Path (Join-Path $runDir 'retry-manifest.json') -Value ([pscustomobject]@{ schemaVersion = 'mastergo-dsl-retry/1'; runId = $manifestObject.runId; sections = @($retry | Sort-Object index) })
        throw "覆盖校验未通过: $((@{ missing = @($missing); failed = @($failed); invalid = @($invalid); sourceNodeCountMismatch = @($mismatch); duplicateNodeRefs = @($duplicate); unknownParentRefs = @($unknownParent) } | ConvertTo-Json -Compress))"
    }
    $retryPath = Join-Path $runDir 'retry-manifest.json'
    if (Test-Path -LiteralPath $retryPath) { Remove-Item -LiteralPath $retryPath -Force }
    Write-AtomicJson -Path $snapshotPath -Value ([pscustomobject]@{ schemaVersion = 'mastergo-dsl-snapshot/1'; runId = $manifestObject.runId; fileId = $manifestObject.fileId; layerId = $manifestObject.layerId; pageName = $manifestObject.pageName; ui = $manifestObject.ui; expectedSectionCount = @($manifestObject.sections).Count; capturedSectionCount = $loaded.Count; expectedNodeCount = $expectedNodeCount; capturedNodeCount = $capturedNodeCount; sections = @($loaded | Sort-Object { $_.task.index } | ForEach-Object { [pscustomobject]@{ sectionIndex = $_.task.index; sectionId = $_.task.sectionId; sectionName = $_.task.name; nodeCount = $_.records.Count; payload = $_.payload } }) })
    [pscustomobject]@{ status = 'complete'; snapshot = $snapshotPath; capturedSectionCount = $loaded.Count; capturedNodeCount = $capturedNodeCount } | ConvertTo-Json
}

try {
    switch ($Action) {
        'Init' { Initialize-Run }
        'Write' { Write-Section }
        'Merge' { Merge-Run }
    }
} catch {
    Write-Error $_.Exception.Message
    exit 1
}

