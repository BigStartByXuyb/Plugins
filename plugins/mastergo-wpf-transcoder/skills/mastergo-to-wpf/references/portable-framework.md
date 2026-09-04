# MasterGo → WPF 可移植转换框架

本文件只包含通用规则，不包含具体项目的 XAML、C#、业务文案、文件 ID、设计链接、私有程序集或公司命名空间。

## 转换流水线

```text
MasterGo 导出/读取
  → 标准化节点树
  → 名称优先的语义分类
  → 可移植中间表示（Portable IR）
  → 模式分派：mode=wpf → WPF 控件发射器（旧模式）
             mode=iocontrol → IOContorl XML 发射器（新模式，绝对坐标直传）
  → 图标/资源校验器（旧）或 坐标核对器 + 键白名单校验（新）
  → 渲染截图与结构检查
```

## 可移植中间表示

```json
{
  "key": "button-001",
  "role": "button",
  "wpfType": "Button",
  "styleFamily": "button",
  "bounds": { "x": 0, "y": 0, "width": 120, "height": 40 },
  "children": [],
  "iconRef": null,
  "textRef": "label-001",
  "controlType": null,
  "ioname": null,
  "iocommand": null,
  "diagnostics": []
}
```

新模式（IOContorl）下 `bounds` 的 x/y 必须为 page-absolute（发射时按父容器原点减差）；`controlType` 为目标 `ControlType`（映射表见 `mtslg-iocontrol-map.json`）；`ioname`/`iocommand` 为业务属性占位——**只标注不捏造**，键必须由项目白名单（`docs/mtslg-keys.json`）验证后注入。

共享输出只使用抽象 key。原始名称、原始 ID、业务文字、文件链接和私有资源路径只能留在本地转换日志。

## 名称驱动的分类伪代码

```text
normalize(name):
    return lowercase(removeSpacesAndSeparators(name))

classify(group):
    name = normalize(group.name)

    # 复合名称先匹配，避免 iconbutton 被普通 button 规则截断
    if containsAny(name, ["iconbutton", "iconbtn", "图标按钮"]): return IconButton
    if containsAny(name, ["buttongroup", "buttonset", "按钮组"]): return ButtonGroup
    if containsAny(name, ["togglebutton", "togglebtn", "切换按钮"]): return ToggleButton

    # 名称明确表示控件时，不能生成 Canvas/普通 Border
    if containsAny(name, ["button", "btn", "按钮"]): return Button
    if containsAny(name, ["checkbox", "check", "复选框"]): return CheckBox
    if containsAny(name, ["textbox", "input", "文本框"]): return TextBox
    if containsAny(name, ["combobox", "dropdown", "下拉框"]): return ComboBox

    if group.type == GROUP and group.children is not empty: return LayoutGroup
    return VisualNode
```

几何外观只能决定布局和尺寸，不能覆盖明确的语义名称。无法判断时使用 `LayoutGroup`，并记录 `ambiguous-name` 诊断，禁止静默生成业务控件。

## WPF 发射规则

```text
Button       → Button + Button style placeholder
IconButton   → Button + icon content + icon-button style placeholder
ButtonGroup  → StackPanel/ItemsControl + child buttons
ToggleButton → ToggleButton + toggle style placeholder
LayoutGroup  → Grid or Border according to layout metadata
VisualNode   → TextBlock/Image/Path according to node type
```

Style key、颜色、字体和私有控件类型使用占位符，例如 `StyleKey.Button`，由目标项目的适配层注入；通用脚本不复制具体 Style 或程序集。

## IOContorl 发射规则（新模式，绝对坐标）

```text
IconButton   → <IOContorl ControlType="IconButton" Icon={iconKey} Style={styleKey} ... Left/Top/Width/Height />
Button       → <IOContorl ControlType="Button" PageName="Jump:{target}" ... />
TextBlock    → <IOContorl ControlType="TextBlock" Value={text} LangName={langKey} ... />
GroupBox     → <IOContorl ControlType="GroupBox" Header={title} ...> 子节点（坐标相对其左上角） </IOContorl>
LayoutGroup  → 无 ControlType 的子 <IOContorl> 容器（框架不支持时展平并重算子坐标）
```

核心规则（详见 `mtslg-mode.md` 与 `mtslg-iocontrol-map.json`）：

- 统一 `<IOContorl>` 标签 + `ControlType` 区分控件；官方拼写 IOContorl（无字母 e）。
- `Left = absX − parentAbsX`，`Top = absY − parentAbsY`，Width/Height 原样；设计稿像素 1:1（画布 1280×1024），允许小数与 NaN；无星号、无缩放。
- Style/Icon/LangName/PageName 必须命中项目键白名单（由 `scan-mtslg-keys.ps1` 从框架 Config 扫描生成）；白名单外禁止使用——闭源框架，先例即证据。
- merge 语义：改现有页面时几何按设计稿更新，现有业务属性（IOName/IOCommand/…）一律保留，冲突只报告不覆盖。

## 项目适配层边界

```text
projectAdapter:
    mapStyle(role)       → target project's style key
    mapIcon(iconRef)     → target project's resource key
    mapText(textRef)     → target project's localization key
    mapNamespace()       → target project's namespace
    mapKey(kind, semantic)  → 新模式：style/icon/langName 三个键族，由项目键白名单注入（白名单外返回 null → 留空并标注待人工）
```

通用框架负责识别和生成结构，项目 adapter 负责接入目标项目样式。共享时只交付通用框架、脱敏示例和适配层接口，不交付 adapter、真实资源或原始项目文件。

## 共享前检查

- 删除真实 MasterGo URL、fileId、layerId 和截图元数据。
- 将业务名称、页面名称、客户名称和中文文案替换为占位符。
- 将私有 namespace、程序集名、Style 名和资源路径替换为 `Target.*` 占位符。
- 只保留能说明规则的最小 JSON、伪代码和通用 XAML 片段。
- 用合成节点树验证 `Button`、`IconButton`、`ButtonGroup` 不会落入 Canvas 分支。

## AspectRatioLock 参考实现（缩放策略 C：只能等比放大缩小）

与 `Viewbox Stretch="Uniform"` 组合使用：窗口任何操作（拖拽/最大化/贴靠/外部改尺寸）都保持设计宽高比，内容永远铺满窗口、无留边、无变形。通用 WPF 代码，无业务内容，可直接复制进项目。

```csharp
// 窗口宽高比锁定: 拖拽(WM_SIZING) / 最大化(WM_GETMINMAXINFO) / 贴靠与外部改尺寸(WM_WINDOWPOSCHANGING)
public static class AspectRatioLock
{
    private const int WM_SIZING = 0x0214;
    private const int WM_GETMINMAXINFO = 0x0024;
    private const int WM_WINDOWPOSCHANGING = 0x0046;
    private const int SWP_NOSIZE = 0x0001;
    private const int MONITOR_DEFAULTTONEAREST = 2;
    private const int VK_LBUTTON = 0x01;

    private const int WMSZ_LEFT = 1, WMSZ_RIGHT = 2, WMSZ_TOP = 3;
    private const int WMSZ_TOPLEFT = 4, WMSZ_TOPRIGHT = 5;
    private const int WMSZ_BOTTOM = 6, WMSZ_BOTTOMLEFT = 7, WMSZ_BOTTOMRIGHT = 8;

    [StructLayout(LayoutKind.Sequential)]
    public struct RECT { public int Left; public int Top; public int Right; public int Bottom; }
    [StructLayout(LayoutKind.Sequential)]
    public struct POINT { public int X; public int Y; }
    [StructLayout(LayoutKind.Sequential)]
    public struct MINMAXINFO
    {
        public POINT ptReserved;
        public POINT ptMaxSize;
        public POINT ptMaxPosition;
        public POINT ptMinTrackSize;
        public POINT ptMaxTrackSize;
    }
    [StructLayout(LayoutKind.Sequential)]
    public struct WINDOWPOS
    {
        public IntPtr hwnd;
        public IntPtr hwndInsertAfter;
        public int x; public int y; public int cx; public int cy;
        public int flags;
    }
    [StructLayout(LayoutKind.Sequential)]
    public struct MONITORINFO
    {
        public int cbSize;
        public RECT rcMonitor;
        public RECT rcWork;
        public int dwFlags;
    }

    [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT rect);
    [DllImport("user32.dll")] public static extern bool GetClientRect(IntPtr hWnd, out RECT rect);
    [DllImport("user32.dll")] public static extern IntPtr MonitorFromWindow(IntPtr hWnd, uint flags);
    [DllImport("user32.dll")] public static extern bool GetMonitorInfo(IntPtr hMonitor, ref MONITORINFO info);
    [DllImport("user32.dll")] public static extern short GetKeyState(int nVirtKey);

    /// <summary>窗口 SourceInitialized 之后调用。designWidth×designHeight 为设计稿尺寸。</summary>
    public static void Attach(Window window, double designWidth, double designHeight)
    {
        var source = (HwndSource)PresentationSource.FromVisual(window);
        if (source == null)
            throw new InvalidOperationException("AspectRatioLock.Attach 必须在窗口 SourceInitialized 之后调用");
        double ratio = designHeight / designWidth;
        // 注意: HwndSourceHook 的委托带 ref 参数, lambda 语法无法声明 ref, 必须用匿名方法
        source.AddHook(delegate (IntPtr hwnd, int msg, IntPtr wParam, IntPtr lParam, ref bool handled)
        {
            switch (msg)
            {
                case WM_SIZING:
                    OnSizing(hwnd, wParam.ToInt32(), lParam, ratio);
                    handled = true;
                    return new IntPtr(1); // WM_SIZING 返回 TRUE 表示已处理
                case WM_GETMINMAXINFO:
                    OnMinMaxInfo(hwnd, lParam, ratio);
                    break;
                case WM_WINDOWPOSCHANGING:
                    OnWindowPosChanging(hwnd, lParam, ratio);
                    break;
            }
            return IntPtr.Zero;
        });
    }

    /// <summary>窗口矩形与客户区矩形的差值(边框+标题栏, 物理像素)。最大化前后该差值会变(不可见缩放边框), 允许少量误差。</summary>
    private static void GetChromeDelta(IntPtr hwnd, out int dw, out int dh)
    {
        RECT client; GetClientRect(hwnd, out client);
        RECT win; GetWindowRect(hwnd, out win);
        dw = (win.Right - win.Left) - client.Right;
        dh = (win.Bottom - win.Top) - client.Bottom;
    }

    // 拖拽: 左右边(含左右角)以宽度为准、高度跟随; 上下边以高度为准、宽度跟随; 锚定对侧不动
    private static void OnSizing(IntPtr hwnd, int edge, IntPtr lParam, double ratio)
    {
        var rc = Marshal.PtrToStructure<RECT>(lParam);
        int dw, dh; GetChromeDelta(hwnd, out dw, out dh);
        int w = rc.Right - rc.Left;
        int h = rc.Bottom - rc.Top;

        bool followWidth = edge == WMSZ_LEFT || edge == WMSZ_RIGHT
                        || edge == WMSZ_TOPLEFT || edge == WMSZ_TOPRIGHT
                        || edge == WMSZ_BOTTOMLEFT || edge == WMSZ_BOTTOMRIGHT;
        if (followWidth)
            h = (int)Math.Round((w - dw) * ratio) + dh;
        else
            w = (int)Math.Round((h - dh) / ratio) + dw;

        switch (edge)
        {
            case WMSZ_LEFT: case WMSZ_TOPLEFT: case WMSZ_BOTTOMLEFT:
                rc.Left = rc.Right - w; break;
            case WMSZ_RIGHT: case WMSZ_TOPRIGHT: case WMSZ_BOTTOMRIGHT:
                rc.Right = rc.Left + w; break;
        }
        switch (edge)
        {
            case WMSZ_TOP: case WMSZ_TOPLEFT: case WMSZ_TOPRIGHT:
                rc.Top = rc.Bottom - h; break;
            case WMSZ_BOTTOM: case WMSZ_BOTTOMLEFT: case WMSZ_BOTTOMRIGHT:
                rc.Bottom = rc.Top + h; break;
        }
        Marshal.StructureToPtr(rc, lParam, true);
    }

    // 最大化: 工作区内最大 5:4 矩形并居中; 拖动范围同样锁定
    private static void OnMinMaxInfo(IntPtr hwnd, IntPtr lParam, double ratio)
    {
        var mmi = Marshal.PtrToStructure<MINMAXINFO>(lParam);
        var mon = new MONITORINFO { cbSize = Marshal.SizeOf<MONITORINFO>() };
        GetMonitorInfo(MonitorFromWindow(hwnd, MONITOR_DEFAULTTONEAREST), ref mon);
        int workW = mon.rcWork.Right - mon.rcWork.Left;
        int workH = mon.rcWork.Bottom - mon.rcWork.Top;
        int dw, dh; GetChromeDelta(hwnd, out dw, out dh);

        int clientW = Math.Min(workW - dw, (int)Math.Round((workH - dh) / ratio));
        int clientH = (int)Math.Round(clientW * ratio);
        mmi.ptMaxSize.X = clientW + dw;
        mmi.ptMaxSize.Y = clientH + dh;
        mmi.ptMaxPosition.X = mon.rcWork.Left + (workW - mmi.ptMaxSize.X) / 2;
        mmi.ptMaxPosition.Y = mon.rcWork.Top + (workH - mmi.ptMaxSize.Y) / 2;

        mmi.ptMaxTrackSize = mmi.ptMaxSize;
        int minClientW = 640; // 与窗口 MinWidth 保持一致
        mmi.ptMinTrackSize.X = minClientW + dw;
        mmi.ptMinTrackSize.Y = (int)Math.Round(minClientW * ratio) + dh;
        Marshal.StructureToPtr(mmi, lParam, true);
    }

    // 贴靠(Win+方向键)/外部 MoveWindow: 以宽度为准修正高度(左上锚定)。
    // 鼠标左键按下=拖拽中, 跳过交给 WM_SIZING 做精确方向锚定, 避免两处修正互相打架。
    private static void OnWindowPosChanging(IntPtr hwnd, IntPtr lParam, double ratio)
    {
        if ((GetKeyState(VK_LBUTTON) & 0x8000) != 0) return;
        var wp = Marshal.PtrToStructure<WINDOWPOS>(lParam);
        if ((wp.flags & SWP_NOSIZE) != 0) return;
        int dw, dh; GetChromeDelta(hwnd, out dw, out dh);
        int newH = (int)Math.Round((wp.cx - dw) * ratio) + dh;
        if (Math.Abs(newH - wp.cy) > 1)
        {
            wp.cy = newH;
            Marshal.StructureToPtr(wp, lParam, true);
        }
    }
}
```

宿主调用（demo Window）：

```csharp
SourceInitialized += (s, e) => AspectRatioLock.Attach(this, 1280, 1024);
```

验证要点：外部 MoveWindow 一个非 5:4 尺寸后 GetWindowRect 应回落到 5:4；最大化后应为工作区内最大 5:4 居中；不同分辨率屏幕（16:9/16:10）上最大化后左右露出桌面属预期（维持比例的前提），向用户说明。

## 无视觉通道的验证方法（Read 工具不支持显示图片时）

1. **像素采样**：确定客户区原点 (ox,oy)（先扫顶栏色带定位）+ 缩放系数 k = 客户区/设计尺寸，把设计坐标关键点换算成截图像素采样比对预期色值。容差：1px 线在分数缩放下抗锯齿混合；ClearType 文字像素会偏色（黑字可能采到棕/蓝色条纹），文字区只验证"存在深色像素"。
2. **ASCII 粗渲染**：把截图按 8~16px 步长采样，颜色映射为字符（黑=#、深蓝=D、白=W、橙=O、蓝系=c…），打印出来肉眼扫版式与遮挡（如终端窗口遮挡会显示大片 #）。
3. **UI Automation**：`AutomationElement.RootElement.FindFirst(ProcessId)` 后按 `AutomationId`（即 x:Name）取 `BoundingRectangle`，秒级定位"控件跑错列/高度塌缩"类问题。
4. **双截图对比**：相隔 800ms 截两张做像素 diff，全 0 差异 = 画面稳定（排除动画/遮挡窗口干扰后才下结论）。
