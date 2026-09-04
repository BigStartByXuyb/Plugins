# cap-window.ps1 的 PrintWindow 增强版: 即使窗口被其他窗口(如终端)遮挡也能截到完整内容
# 用法: pwsh -File cap-window2.ps1 -ProcName <进程名> -Out <png>
param(
  [Parameter(Mandatory=$true)][string]$ProcName,
  [Parameter(Mandatory=$true)][string]$Out
)

$src = @"
using System;
using System.Runtime.InteropServices;
public struct RECT2 { public int Left; public int Top; public int Right; public int Bottom; }
public static class U32B {
    [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT2 r);
    [DllImport("user32.dll")] public static extern bool PrintWindow(IntPtr h, IntPtr hdc, uint flags);
    [DllImport("user32.dll")] public static extern bool SetProcessDPIAware();
}
"@

Add-Type -AssemblyName System.Drawing
Add-Type -TypeDefinition $src
[void][U32B]::SetProcessDPIAware()

$p = Get-Process -Name $ProcName -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne 0 } | Select-Object -First 1
if (-not $p) { Write-Output "process not found"; exit 1 }

$h = $p.MainWindowHandle
$r = New-Object RECT2
[void][U32B]::GetWindowRect($h, [ref]$r)
$w = $r.Right - $r.Left
$ht = $r.Bottom - $r.Top
if ($w -le 0 -or $ht -le 0) { Write-Output "bad rect ${w}x${ht}"; exit 1 }

$b = New-Object System.Drawing.Bitmap $w, $ht
$g = [System.Drawing.Graphics]::FromImage($b)
$hdc = $g.GetHdc()
# PW_RENDERFULLCONTENT = 0x2: WPF/DirectComposition 内容也完整渲染
[void][U32B]::PrintWindow($h, $hdc, 2)
$g.ReleaseHdc($hdc)
$b.Save($Out)
Write-Output "captured ${w}x${ht} -> $Out"
$g.Dispose(); $b.Dispose()

# 注意: PrintWindow 截图中窗口边框/不可见缩放边框区域是黑色, 属正常;
# 分析内容前先确定客户区原点(标题栏+边框偏移), 别把边框黑带当内容缺陷。
