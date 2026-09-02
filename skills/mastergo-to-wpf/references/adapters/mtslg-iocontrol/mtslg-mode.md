# MTSLG IOContorl 模式完整手册（mastergo-to-wpf 新模式）

> 本文件是「新模式（MTSLG IOContorl）速览」（SKILL.md）的完整细则。旧模式规则见 SKILL.md 其余章节。

## 1. 框架事实（先读，避免踩坑）

| 事实 | 说明 |
|---|---|
| 框架形态 | 以目标项目 `framework.config.json` 指向的部署树为准；可能是闭源部署树，也可能是源码工程 |
| 运行程序 | `MaxWell.Client.exe`（进程名 `MaxWell.Client`），日志模块名 MaxwellFramework |
| 盘符映射 | 由目标项目配置提供；不得假设 `J:`、固定盘符或固定运行目录 |
| 页面载体 | `{Name}Page.xml`，放 `Config\<平台>\Pages\`（当前以 **Common** 为主）；运行中页面按 **Ctrl+R** 重载（PageDesign.ReLoaded） |
| 页面注册 | `Config\SLG2A\Configuration\Layout.xml`（3419 行）：`<Page Target="X" LangName="XPageTitle"/>`，带菜单页内嵌 `<Menu><MenuItem PageName="Jump:X" .../></Menu>` |
| 多语言 | `Config\Common\Language\MaxWellClient_CN.xaml` / `_EN.xaml`（注意 **MaxWellClient** 系列；MaxwellFramework_CN.xaml 只有框架通用键）。Home* 键实测在 MaxWellClient 中 |
| 权威文档 | 由目标项目的 `source_root`、`index_root` 和项目文档提供；界面设计器属性表、快捷键和运行约束必须现场确认 |
| 黄金样例 | `Config\Common\Pages\HomeContentPage.xml`（117 行：根 NaN、`Left="411.33"` 小数、Value+LangName 并存、`PageName="Jump:X"`） |
| ⚠️ 重复副本 | 如果项目存在多个部署副本，必须从配置和运行进程确认生效目录；同步脚本应拒绝未确认的副本路径 |
| Target↔文件映射 | 部分在闭源代码中（`IOViewPage.xml` 未注册于 Layout.xml 却能加载）。新建页面首次必须人工验证加载 |

## 1.1 MasterGo 组件库映射入口

本手册负责 IOContorl 页面格式、运行时约束、坐标和验证流程；MasterGo 组件集如何匹配固定 IOContorl 模板，统一读取同目录的本地工作副本 [飞书组件库映射规范](./feishu-component-library-mapping.md)。后续规则更新直接修改此本地文件，不把线上飞书文档作为运行时依赖。

- 先按飞书规范匹配父节点语义、公开变量属性和真实变量值；
- 再按本手册核对 `ControlType`、允许属性、坐标、资源键和运行时先例；
- 两份规则冲突或组件无法唯一命中时，标记待确认并暂停最终 XML 生成，不得自行套用相似模板。

## 2. 页面文件格式规范

```xml
<?xml version="1.0" encoding="utf-8"?>
<!-- 页面中文名（可选注释） -->
<IOContorl
    ID=""
    Left="NaN"
    Top="NaN"
    Width="NaN"
    Height="NaN">
    <IOContorl
        ID="AutoCut"
        ControlType="IconButton"
        Style="MainButtonStyle"
        Icon="HomePageF1Geometry"
        LangName="HomeFullAuto"
        PageName="Jump:Manual"
        TopLeftContent="F1"
        Value="全自动操作"
        Left="10"
        Top="35"
        Width="160"
        Height="150" />
</IOContorl>
```

- 官方标签拼写 **IOContorl**（无字母 e）；根与子节点统一该标签，`ControlType` 区分控件。
- 编码 UTF-8 无 BOM、4 空格缩进、每属性一行（自闭合 ` />`；容器成对标签）。
- 属性值转义：`&` → `&amp;`、`<` → `&lt;`、`>` → `&gt;`（IOEnable 表达式里 `&&` 必须写 `&amp;&amp;`）。
- 通用属性：`ID`（赋值给 .Name，示例用 `MX_`+32 位 hex 或语义名）、`ControlType`、`IOEnable`/`IOVisible`（条件表达式，如 `CTC.RUN==0`）、`Height/Width/Margin/Left/Top`、`Style`（框架样式键）、`LangName`（多语言键）。

## 3. 坐标规则（核心，比旧模式简单得多）

- **先识别公共栏，再归一**：从宿主页面、Layout 配置和运行截图建立 `ContentRect`。顶部/底部公共栏默认由宿主负责、页面不生成；左右区域必须按目标框架职责逐侧判断，不能把左右节点一律当公共栏或一律当页面内容。
- **页面坐标不是完整窗口坐标**：本项目顶部公共栏 126px 与根级设计稿标题 66px 均属于固定公共外壳，标题始终按 `design-artifact-title` 剥离；因此根级保留业务节点统一计算 `PageY = MasterGoY − 126 − 66 = MasterGoY − 192`。该 192px 是当前项目固定约定，不能改成按单个控件手调，也不设置标题保留分支。嵌套控件不重复扣除页面偏移。
- **公共栏节点不重复生成**：顶部/底部公共背景、标题栏、状态栏、底部快捷键区和宿主已有控件必须在映射表标记“框架负责、页面不生成”；页面标题只有在 MasterGo 业务区确有独立标题节点且宿主不提供时才生成。
- **组件文本高度与字号分开处理**：MTSLG 中由组件实例映射出的 `TextBlock`（标签、数值、单位）`Height` 取对应外层组件实例的实际高度（例如 40、20、18），不得把所有组件统一写成 40，也不得使用内部文字 bbox 或 FontSize 替代组件外层高度。`FontSize` 不能省略：从 MasterGo DSL 的 `styles.font_*/value/size` 读取并写入（例如标题 20、普通标签/单位 16、数值 18）。只有独立、非组件映射文本才按自身 bbox 取高度；无 bbox 时才可用框架默认高度，并记录 `heightFallback=true`。
- **文本来源与 `Value` 硬门禁**：每个 `TextBlock` 的 `Value` 必须回溯到唯一 MasterGo `layerId`/DSL `ref` 及其真实文本节点；不得依据 XML `ID`、控件名称、坐标方向、页面语义或相邻实例推断文本。`RelativePositionXLabel` 不能因为名称含有 `X` 就写成 `Value="X"`。例如页面中的 `3:56338` DSL 文本是“镜头倍率”，兄弟图层 `3:56367` 才是“Y”，两者不能互换。生成前必须逐项核对“XML 节点 → layerId/ref → 父节点链 → 原始文本 → Value”；不一致即停止生成并标记待确认。
- **设计稿最上方示例标题默认剥离**：位于根节点/展示外壳、用于说明组件或工件示教的标题（例如“工件边缘示教（2.2.1.E）”）标记为 `design-artifact-title`，不写入页面 XML。业务内容容器内部且运行时需要的标题才保留。
- **设计稿像素 1:1 直传（归一后）**：`Left = pageAbsX − parentPageAbsX`，`Top = pageAbsY − parentPageAbsY`，Width/Height 原样。画布 1280×1024（与 Layout.xml `WindowWidth/WindowHeight` 一致）。
- 允许小数（先例 `Left="411.33"`、`Top="223.61"`）、允许负数（先例 `Left="-12"`）、NaN 表示自适应（根节点四属性均为 NaN；叶子无宽高时省略属性）。
- 子控件坐标相对**父容器左上角**（GroupBox 内子项 `Left="29" Top="6"` 是相对 GroupBox 的）。
- 当根组件 `rootContainer.overflow` 为 `hidden` 时，必须保留外层布局容器及其 `Width/Height` 裁剪边界，内部子控件继续使用相对父容器坐标；该规则优先于模板中“平级节点”的展开形式。只有无裁剪需求时才允许展开为同级节点，且必须保留等价裁剪边界。
- 无 Viewbox、无缩放、无星号数学、无"三类固定不缩放"——`gen-iocontrol-xml.js` 全自动完成，禁止手工重写坐标。
- 取数后先核对 rootMetadata = 1280×1024：不符先与用户确认页面区域（坐标直传下画布错 = 全局错位）。

## 4. ControlType 摘要（27 种，全表见 mtslg-iocontrol-map.json）

| 类别 | ControlType |
|---|---|
| 容器 | View（页签，Value=标题/Index/Icon）、GroupBox（Header）、Border（Value=线宽）、ButtonGroup（内放 RadioButton 共用 IOName）、TabControl+TabItem |
| 文本/输入 | TextBlock、TextBox（Keypad）、NumberBox（DecimalPlaces 默认 3）、IntNumberBox、CheckBox |
| 按钮 | Button（PageName="Jump:X"/IOName/IOStyle）、IconButton（Icon=Geometry 键/TopLeftContent=F1..F12）、StatusButton（IOState 状态色）、Togglebutton、RadioButton |
| 选择 | ComboBox（选项=子 TextBlock；ItemsSourceFile/DisplayMemberPath/SelectedValuePath） |
| 数据 | DataGrid（Value=数据文件名；列=子 TextBlock/ComboBox）、ProgressBar、RangeProgressBar、PowerControl（实时功率曲线） |
| 视觉/设备 | Image（Value=绝对路径）、Camera（DesignPanelID）、AutoCutCamera、HighAngleCamera、LowAngleCamera、EMTCamera |

控件属性允许集在同目录 `mtslg-iocontrol-map.json`（`controlTypes` 字段）；映射 JSON 里写了白名单外的属性时生成器照发，但键校验环节会拦截 Style/Icon/LangName/PageName。若部署架构确认 IOContorl 是共享 SDC 资源字典的 XML 封装，Style/Icon 可直接以 SDC 资源键为依据；这不改变 ControlType 属性允许集。

### 4.1 DataGrid 的 Value 必填契约（实测）

- `ControlType="DataGrid"` 必须声明 `Value`；该值用于定位 PageData 数据文件。
- 最终页面中的 `Value` 必须是非空、可由当前运行配置解析的数据文件名。若真实数据源尚未确认，应将该控件标记为“待绑定/未完成”并向用户确认，不能把空值当作最终配置。
- 完全省略 `Value` 会在 `CanvasHelper.CreateDataGridControl → IODataGrid.LoadDataSource` 调用链中触发 `NullReferenceException`，界面设计器只显示“未将对象引用设置到对象的实例”。
- `Value=""` 可用于受控诊断，能够避开“属性对象不存在”的空引用，但仍可能产生空文件名相关警告，因此只能作为中间态。
- 子列节点是否存在与上述空引用无关；实测删除列节点仍可创建控件。该必填规则只适用于 DataGrid，不适用于 RadioButton。

```xml
<IOContorl
    ID="MX_ExampleGrid"
    ControlType="DataGrid"
    Value="ExampleData.xml"
    Left="0"
    Top="0"
    Width="600"
    Height="320">
    <!-- 列节点 -->
</IOContorl>
```

## 5. merge 语义（改现有页面的强制模式）

`gen-iocontrol-xml.js --merge <现有XML> <mapping.json>` 的行为：

1. **匹配**：映射节点 ↔ 现有节点，ID 优先；无 ID 时按 ControlType + Left/Top（容差 0.5）位置匹配。
2. **几何更新**：Left/Top/Width/Height 按映射更新（这就是设计稿改动的落点）。
3. **ControlType**：按映射更新，变化写冲突报告。
4. **业务属性保护**：现有 XML 同名的属性一律保留现有值（值不同 → 冲突报告，不覆盖）；映射多出来的属性 → 追加（新增报告）。工程师手写的 IOName/IOCommand/IOState 等永远不会被设计稿冲掉。
5. **节点增删**：映射里的新节点渲染插入父容器闭合标签前；现有但映射未涉及的节点原样保留（报告列出）。
6. **格式最小扰动**：未触及的节点与注释逐字节保留；被替换节点跟随原样式（单行/多行）。

**为什么禁止整文件重写**：设计稿没有 IO 绑定信息，`--fresh` 重写会丢掉工程师手写的 IOName/IOCommand/IOEnable 等业务属性。改现有页面一律 `--merge`。

## 6. 键查证四步（禁止捏造）

白名单文件：项目 `docs/mtslg-keys.json`（`scan-mtslg-keys.ps1` 生成/刷新，键改动后重跑）。

```
① Style/Icon：若 IOContorl 与 SDC 共用运行时资源字典，值可直接在 SDC 源码的真实 `x:Key`/Geometry 中验证，现有页面 XML 用于补充运行先例；若未确认共享资源，才要求其他页面 XML 或 Layout.xml 先例（键目录 styles/icons 需记录来源）
② LangName：x:Key 必须在 MaxWellClient_CN.xaml 且 _EN.xaml 成对存在（白名单 langNames.verified）
   新键 → 人工在两个语言文件各加一条（只加 CN 会致英文环境空白）
   ⚠️ 实测：语言字典在程序**启动时**加载，Ctrl+R 只重载页面 XML、不重载语言文件——
   新增词条后必须**重启程序**（否则按钮显示 "resouce:[key] not found!"）；
   如果目标项目存在多个语言目录或部署副本，必须根据项目配置和运行进程确认全部生效位置；不能假设存在固定的副本目录。
   ⚠️⚠️ 实测：语言文件是 **UTF-8 带 BOM**（EF BB BF），框架解析器依赖 BOM——
   编辑后若丢 BOM 会**启动崩溃**（dump 名 crash(STARTUP-时间).dmp）。改完必须验证
   前 3 字节 = EF BB BF。页面 XML 则相反：UTF-8 无 BOM（与 HomeContentPage.xml 一致）。
③ PageName="Jump:X" 的 X 必须在 Layout.xml <Page Target> 集合内（白名单 pageTargets）
④ IOName：查 Config\<平台>\Io\ 或现有页面先例（白名单 ioNames 只记录存在性）
   查不到 → 留空 + 注释「待人工绑定」，禁止编造 CTC.xxx
```

①-③ 不通过 → **禁止使用该键**：向用户要键、人工加键、或留空标注。IOCommand（VM 方法名）同理只可复用先例（白名单 ioCommands），新方法标注待人工。

## 7. 工作流

### 7.0 最终交付门禁（新模式强制）

新模式在用户要求项目部署、Ctrl+R 或可运行页面时，目标是最终可运行页面，不是 `test.xml`、临时稿或“先能显示再补组件”的中间结果。用户只要求独立结构映射 XML 时，可以没有目标项目，但必须先完成正式组件映射，并按映射生成真实控件结构；不能因为运行时配置缺失而退化为无类型容器。

- “按钮”“相机”“下拉框”“输入框”“容器”等名称只能作为线索；必须结合组件实例、变体、父子布局、位置和目标项目先例选择 `IconButton`、`Camera`、`ComboBox`、`NumberBox`、`GroupBox` 等真实组件。
- 组件库没有明确匹配项时必须暂停，并向用户询问：新增组件、采用已有近似组件，还是只做静态显示/待人工绑定。不得自行用图片、SVG 背景、普通 `Button`、空 `Border` 或自绘结构替代并声称完成。
- 中间映射表可以生成，但不得把临时 XML 替换到目标页面作为交付。只有组件、样式、图标、IO 绑定、坐标、键白名单、同步、Ctrl+R 重载和视觉核对全部通过，才能报告完成。

### 7.1 公共前置

1. 确认模式：项目运行时交付时读取目标项目根目录的 `framework.config.json`；独立结构映射稿可由用户明确的 IOContorl 输出目标选择 `mtslg-iocontrol`，不因缺少配置而改变正式组件映射。
2. 取数：MasterGo 链接 → `getDesignSections` 总览（核对 rootMetadata = 1280×1024）→ 逐个拉全部 section DSL。
3. 首次（或键有变动时）运行 `scan-mtslg-keys.ps1` 生成/刷新 `docs/mtslg-keys.json`。
4. **建立公共栏边界表**：记录顶部/底部公共 section、左右区域职责、`ContentOriginX/Y`、内容区尺寸，以及每个被剥离节点的 section/node id；未完成前不得写 XML。
5. 如果目标项目存在多份样式/主题资源库，先按 `references/style-library-profiles.md` 确认 Profile ID、版本和加载优先级；结构映射稿只能写入已有映射表或已提供本地资源库中可核验的 Style/Icon，未确认的运行时键写入注释或 manifest，不得伪造。

### 7.2 路径 A：修改现有页面（当前主路径）

1. 读现有页面 XML（Common 目录为主；与平台目录同名时默认改 Common 版并在说明中标注，不生效再核对平台版）。
2. 建映射：先套用公共栏边界表并归一 bbox，再写 DSL 节点 → 映射 JSON（`ref`/`id`/`controlType`/`parent`/pageAbsX/pageAbsY/w/h/attrs）；公共栏节点保留审计记录但不进入页面映射。
3. Group 语义用 `classify-mastergo-groups.js` 的 role，再经 `mtslg-iocontrol-map.json` roleMap 定 ControlType；不得用相机/按钮实例在有效相机组件外重复搭建内部控件。
4. `gen-iocontrol-xml.js --merge <现有XML> <mapping.json> --out <项目>\Pages\<Name>Page.xml` → 读 merge 报告，逐条裁决冲突。
5. `check-iocontrol-coords.js --xml <产出> --nodes <节点表>`：0 MISMATCH / 0 EXTRA。
6. 键查证四步（第 6 节）→ 白名单外键全部处理掉。
7. `sync-to-mt.ps1` 按目标项目配置同步到已确认的运行配置目录（强制备份）；不得写死 `J:` 或某个盘符。
8. 运行中的 MaxWell.Client 切到目标页 → **Ctrl+R** → 截图核对（第 8 节）。
9. 通过后留档（`Pages\` 源文件 + `docs\mtslg-worklog.md` 记录链接/边界表/映射/待人工项）；SVN 提交由用户自行决定。

### 7.3 路径 B：新建页面（可选）

1. `gen-iocontrol-xml.js --fresh <mapping.json> --out <Name>Page.xml`（根节点自动生成 NaN 骨架）。
2. **Layout.xml 注册**：`<Pages>` 内加 `<Page Target="X" LangName="XPageTitle"/>`（带菜单加 `<Menu><MenuItem Name=.. LangName=.. PageName="Jump:X" TopLeftContent=.. Index=.. Icon=../></Menu>`）。改前备份 Layout.xml。
3. **语言键**：`MaxWellClient_CN.xaml` 与 `_EN.xaml` 各加 `x:Key="XPageTitle"`（页面内所有 LangName 键同此，成对必须）。
4. 坐标核对 → 同步 → Ctrl+R。
5. **风险闸**：Target→文件名映射部分在闭源代码，首次必须人工验证加载；失败则回退「改现有页面」路径并报告。

## 8. 验证方法

静态（生成后立即）：
- `check-iocontrol-coords.js`：0 MISMATCH、0 EXTRA（容差 0.5px）。
- 键白名单校验（手动/生成器报告交叉核对）。
- XML 可解析、无重复 ID、根节点 NaN 正确。

运行时（Ctrl+R + 截图）：
1. 切到目标页 → Ctrl+R 等约 1 秒。
2. `cap-window.ps1 -ProcName MaxWell.Client -Out page.png`（遮挡用 cap-window2.ps1）。
3. 坐标换算：客户区 == 1280×1024 → k=1 直映射；否则客户区原点 + `k=min(cw/1280, ch/1024)` 并记录说明。
4. 按 DSL bbox 裁剪关键区逐区对照；像素采样/ASCII 粗渲染（见 portable-framework.md「无视觉通道的验证方法」）。
5. 检查 LangName 生效（中文环境）、IOEnable/IOVisible 无缺键报错。

## 9. 风险与实测待办

- **首次实测三项（跑通后回填本手册）**：① 窗口客户区是否恰为 1280×1024（决定 k=1 还是按比例）；② Ctrl+R 的焦点前提（页面窗口需聚焦？）；③ Common 与平台目录同名页的加载优先级。
- SVN 工作树：改动前备份、不自动 commit；改完提示用户自行提交。
- 如果存在重复部署副本，必须以 `framework.config.json` 和运行进程确认的生效目录为准。
- 布局分组（无控件语义的 Group）：可以在 mapping manifest 中保留原始层级，但最终可加载的 IOContorl XML 不得输出运行时不识别的无 `ControlType` 容器；应展平到最近有效父容器并重算子坐标，或使用映射表中已确认的容器 ControlType。根组件 `rootContainer.overflow=hidden` 时必须保留等价外层裁剪边界。
- 语言键文件是 **MaxWellClient** 系列；Home* 键实测在其中。白名单里 langNames.missing/cnOnly 是现有页面的存量诊断，新产出一律不允许新增此类键。

## 10. 脚本索引（scripts/）

| 脚本 | 用途 | 模式 |
|---|---|---|
| `gen-iocontrol-xml.js` | IOContorl XML 发射器（--fresh / --merge） | 新 |
| `check-iocontrol-coords.js` | 页面坐标逐控件核对（0 MISMATCH 硬门） | 新 |
| `scan-mtslg-keys.ps1` | 键白名单生成（styles/icons/langNames 成对/pageTargets/ioCommands/ioNames） | 新 |
| `sync-to-mt.ps1` | 安全同步：备份+回滚+拒绝副本路径+svn 摘要 | 新 |
| `classify-mastergo-groups.js` | Group 名称→语义 role 分类 | 双模式共用 |
| `cap-window.ps1` / `cap-window2.ps1` | 截图验证（新模式 `-ProcName MaxWell.Client`） | 双模式共用 |
| `gen-icons-xaml.js` / `scan-icon-coords.js` | 图标资源生成/越界扫描 | 仅旧模式 |
| `convert-to-responsive.js` | 响应式 HTML（可选产出） | 双模式共用 |
