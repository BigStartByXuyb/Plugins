# MTSLG IOContorl 完整手册

## 1. 项目适配信息（开工前确认）

本手册只规定可复用的 XML 结构、映射门禁与验证流程。运行程序、部署目录、页面注册文件、语言字典、重载动作和资源目录必须由目标项目的配置、源码或运行现场确认；不得将具体盘符、文件名、行数、进程名或页面样例写成通用规则。
开工前建立项目适配记录：

- 运行宿主：实际启动程序、日志位置与页面重载动作。
- 部署根目录：唯一生效的配置树；存在多个副本时逐一确认加载关系。
- 页面目录：`{PageName}Page.xml` 的实际输出目录与命名规则。
- 页面注册：页面 Target、菜单项与目标页面文件的关联方式。
- 多语言目录：每种语言的资源文件、键命名规则与重载/重启要求。
- 资源键来源：Style、Icon、LangName、IOName 与 IOCommand 的可核验来源。
- 页面文件骨架：见第 2 节；组件固定模板、节点结构与字段来源以同目录的飞书组件库映射规范为唯一来源。
- 内容区坐标：`contentOriginX`、`contentOriginY`、设计稿标题处理与目标画布尺寸。
- Target 映射：新建页面首次必须以运行时加载验证页面 Target 与文件的实际关联。

## 1.1 MasterGo 组件库映射入口

本手册负责 IOContorl 页面格式、运行时约束、坐标和验证流程；MasterGo 组件集如何匹配固定 IOContorl 模板，统一读取同目录的本地工作副本 [飞书组件库映射规范](./feishu-component-library-mapping.md)。页面顶部栏、底部栏和键盘提示如何写入 Layout.xml，统一读取 [页面壳层 Layout 映射规范](./feishu-layout-mapping.md)。后续规则更新直接修改本地工作副本，不把线上飞书文档作为运行时依赖。

- 先按飞书规范匹配父节点语义、公开变量属性和真实变量值；
- 再按本手册核对 `ControlType`、允许属性、坐标、资源键和运行时先例；
- 两份规则冲突或某个组件无法唯一命中时，只隔离该组件：标记待确认并保留其 DSL 来源、坐标和 provenance；不得自行套用相似模板，也不得阻塞其他已唯一命中组件的 XML 生成。

### 1.2 Layout 文件处理

- 目标项目已有 `layout_file` 且文件存在：读取其真实节点结构、字段和运行时键，按现有结构增量注册。
- 目标项目声明了 `layout_file` 但文件不存在，且用户要求生成新页面：按 [页面壳层 Layout 映射规范](./feishu-layout-mapping.md) 的正式模板新建 Layout 文件，并写入已由 DSL 和正式映射确认的 `Page`、`Menu`、`MenuItem` 字段。
- 新建 Layout 时，未从目标项目或 MasterGo 确认的 `PageName`、`IOEnable`、`UserRightId`、运行时 Target 关联等字段不得猜写；缺少这些字段不阻塞静态页面和 Layout 模板生成，但必须在交付清单中标记运行时待确认。
- 不得从其他项目复制 Layout 结构、菜单字段、页面 Target 或运行时键。

页面和图标的正式输出路径也必须先完成项目适配：有效配置优先，其次读取目标 `.csproj` 的页面、图标和 Layout 声明。`Generated/` 只用于 provenance、manifest 和验证产物；项目文件已经给出唯一路径时，不能把页面 XML、页面 Icon 或 Layout 写到 `Generated/` 代替运行目录。Icon 映射必须提供英文资源名和中文注释名；XAML 注释只写中文名称，重复资源名由生成器按稳定数字后缀解析，禁止使用图层 ID 拼接 `MGIcon_*` 键。

## 2. 页面文件骨架

### 页面根节点骨架

固定节点：一个根 `IOContorl`；根节点使用 `NaN` 表示页面自适应骨架，业务控件作为其子节点。 `{page_children}` 仅由已确认的组件固定模板发射。

```xml
<?xml version="1.0" encoding="utf-8"?>
<IOContorl
    ID="{page_root_id}"
    Left="NaN"
    Top="NaN"
    Width="NaN"
    Height="NaN">
    {page_children}
</IOContorl>
```

页面根 ID 由页面标识或目标项目约定填写；位置与尺寸固定为 `NaN`。根节点不得承担业务控件的 `ControlType`、Style、Icon 或业务绑定。

## 3. 坐标规则（核心）

- **先识别公共栏，再归一**：从宿主页面、Layout 配置和运行截图建立 `ContentRect`。顶部/底部公共栏默认由宿主负责、页面不生成；左右区域必须按目标框架职责逐侧判断，不能把左右节点一律当公共栏或一律当页面内容。
- **页面坐标不是完整窗口坐标**：根级保留业务节点统一计算 `PageX = MasterGoX − contentOriginX`、`PageY = MasterGoY − contentOriginY`。`contentOriginX/Y` 由第 1 节项目适配记录给出；公共栏和 `design-artifact-title` 的偏移只能在根级归一化时扣除一次，嵌套控件不重复扣除。不得按单个控件手调偏移。
- **公共栏节点不重复生成**：顶部/底部公共背景、标题栏、状态栏、底部快捷键区和宿主已有控件必须在映射表标记“框架负责、页面不生成”；页面标题只有在 MasterGo 业务区确有独立标题节点且宿主不提供时才生成。
- **组件文本高度与字号分开处理**：由组件实例映射出的 `TextBlock`（标签、数值、单位）`Height` 必须取对应外层组件实例的实际高度；不得使用内部文字 bbox 或 `FontSize` 替代组件高度。`FontSize` 从该实例 MasterGo DSL 的字体属性读取并写入。只有独立、非组件映射文本才按自身 bbox 取高度；无 bbox 时使用目标项目已确认默认值，并记录 `heightFallback=true`。
- **文本来源与 `Value` 硬门禁**：每个 `TextBlock` 的 `Value` 必须回溯到唯一 MasterGo `layerId`/DSL `ref` 及其真实文本节点；不得依据 XML `ID`、控件名称、坐标方向、页面语义或相邻实例推断文本。生成前必须逐项核对“XML 节点 → layerId/ref → 父节点链 → 原始文本 → Value”；不一致即停止生成并标记待确认。
- **设计稿最上方示例标题默认剥离**：位于根节点或展示外壳、仅用于说明组件或工件示教的标题标记为 `design-artifact-title`，不写入页面 XML。业务内容容器内部且运行时需要的标题才保留。
- **设计稿像素直传（归一后）**：`Left = pageAbsX − parentPageAbsX`，`Top = pageAbsY − parentPageAbsY`，Width/Height 原样。目标画布尺寸必须与第 1 节适配记录一致；不允许从固定分辨率、截图缩放或其他页面推断。
- 允许小数与负数；`NaN` 表示自适应（根节点四属性均为 `NaN`；叶子无宽高时省略属性）。具体数值必须来自当前实例的 MasterGo bbox。
- 子控件坐标相对**父容器左上角**；父容器与子控件的坐标关系必须由唯一 MasterGo 父子链和 bbox 计算。
- 当根组件 `rootContainer.overflow` 为 `hidden` 时，必须保留外层布局容器及其 `Width/Height` 裁剪边界，内部子控件继续使用相对父容器坐标；该规则优先于模板中“平级节点”的展开形式。只有无裁剪需求时才允许展开为同级节点，且必须保留等价裁剪边界。
- 无 Viewbox、无缩放、无星号数学、无"三类固定不缩放"——`gen-iocontrol-xml.js` 全自动完成，禁止手工重写坐标。
- 取数后先核对 `rootMetadata` 与已确认目标画布尺寸一致；不一致时先与用户确认页面区域，不能继续生成。

## 4. ControlType 摘要（完整表见 mtslg-iocontrol-map.json）

| 类别 | ControlType |
|---|---|
| 容器 | View（页签，Value=标题/Index/Icon）、GroupBox（Header）、Border（Value=线宽）、ButtonGroup（内放 RadioButton 共用 IOName）、TabControl+TabItem |
| 文本/输入 | TextBlock、TextBox（Keypad）、NumberBox（DecimalPlaces 默认 3）、IntNumberBox、CheckBox |
| 按钮 | Button（PageName="Jump:X"/IOName/IOStyle）、IconButton（Icon=Geometry 键/TopLeftContent=F1..F12）、StatusButton（IOState 状态色）、Togglebutton、RadioButton |
| 选择 | ComboBox（选项=子 TextBlock；ItemsSourceFile/DisplayMemberPath/SelectedValuePath） |
| 数据 | DataGrid（Value=数据文件名；列=子 TextBlock/ComboBox）、ProgressBar、RangeProgressBar、PowerControl（实时功率曲线） |
| 视觉/设备 | Image（Value=绝对路径）、Camera（DesignPanelID）、AutoCutCamera、HighAngleCamera、LowAngleCamera、EMTCamera |

控件属性允许集在同目录 `mtslg-iocontrol-map.json`（`controlTypes` 字段）；生成器不得把白名单外属性当作合法字段。Style、Icon、LangName 与 PageName 还必须通过第 6 节键查证。资源字典是否共享、资源键来自何处，均由项目适配记录确认。

### 4.1 DataGrid 的 Value 数据源门禁

- `ControlType="DataGrid"` 必须声明 `Value`；该值用于定位 PageData 数据文件。
- 最终页面中的 `Value` 必须是非空、可由当前运行配置解析的数据文件名。若真实数据源尚未确认，应将该控件标记为“待绑定/未完成”并向用户确认，不能把空值当作最终配置。
- 缺少 `Value` 时的运行时行为必须通过目标项目的控件契约或实际验证确认；若目标运行时要求该字段，缺失即视为未完成，不能作为最终交付。
- `Value=""` 仅可作为经用户确认的诊断中间态；最终交付必须填入可解析的数据源，或明确标记待绑定。
- 子列结构、数据源字段和错误表现均以目标项目 DataGrid 契约为准；不能从其他项目的页面或异常信息推导。

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

## 6. 键查证门禁（禁止捏造）

目标项目必须提供或生成可追溯的键目录；目录记录每个可用键的来源文件、加载范围与验证状态。没有项目键目录时，先从目标项目配置、资源字典、语言字典、页面注册与已运行页面建立目录，不能套用其他项目的键。

1. **Style / Icon**：在目标项目实际加载的资源字典或正式资源清单中查证；记录资源键与来源。
2. **LangName**：在目标项目要求的全部语言字典中查证；新增键必须在每种必需语言中成对提供，并按目标项目要求执行重载或重启验证。
3. **PageName**：`Jump:{target}` 中的 `{target}` 必须存在于目标项目实际加载的页面注册集合；新 Target 必须先完成注册与首次加载验证。
4. **IOName / IOCommand / IOState**：仅可使用目标项目业务配置、接口定义或已运行页面中可核验的字段；未确认时留空并标记“待人工绑定”。

任一键未通过查证时，禁止将其写入最终 XML。可选处理只有三种：由用户提供已确认键、在目标项目中完成正式登记，或留空并标注待人工处理。
## 7. 工作流

### 7.0 最终交付门禁

用户要求项目部署、运行时重载或可运行页面时，目标是最终可运行页面，不是临时稿或“先能显示再补组件”的中间结果。用户只要求独立结构映射 XML 时，可以没有目标项目，但必须先完成正式组件映射，并按映射生成真实控件结构；不能因为运行时配置缺失而退化为无类型容器。

- “按钮”“相机”“下拉框”“输入框”“容器”等名称只能作为线索；必须结合组件实例、变体、父子布局、位置和目标项目先例选择 `IconButton`、`Camera`、`ComboBox`、`NumberBox`、`GroupBox` 等真实组件。
- 组件库没有明确匹配项时，保留该组件的真实 DSL 来源、坐标和 provenance，并在待绑定清单中标记“正式组件映射缺失”；不得用图片、SVG 背景、普通 `Button`、空 `Border` 或自绘结构替代。其他已映射组件继续生成。
- 不得把包含待绑定组件的静态页面报告为完整可运行页面；交付报告必须分别列出“静态页面和 Layout 已生成”“未映射组件待绑定”“运行宿主加载验证状态”。

### 7.1 公共前置

1. 确认模式：项目运行时交付时读取目标项目提供的适配配置；独立结构映射稿可由用户明确的 IOContorl 输出目标选择 `mtslg-iocontrol`，不因缺少配置而改变正式组件映射。
2. 取数：MasterGo 链接 → `getDesignSections` 总览（核对 `rootMetadata` 与适配记录的画布尺寸一致）→ 逐个拉取全部 section DSL。
3. 首次（或键有变动时）运行 `scan-mtslg-keys.ps1` 生成/刷新 `docs/mtslg-keys.json`。
4. **建立公共栏边界表**：记录顶部/底部公共 section、左右区域职责、`ContentOriginX/Y`、内容区尺寸，以及每个被剥离节点的 section/node id；未完成前不得写 XML。
5. 如果目标项目存在多份样式/主题资源库，先按 `references/style-library-profiles.md` 确认 Profile ID、版本和加载优先级；结构映射稿只能写入已有映射表或已提供本地资源库中可核验的 Style/Icon，未确认的运行时键写入注释或 manifest，不得伪造。

### 7.2 路径 A：修改现有页面（当前主路径）

1. 读目标项目实际加载的现有页面 XML；由适配记录确认唯一生效版本，不能按目录名或历史副本猜测。
2. 建映射：先套用公共栏边界表并归一 bbox，再写 DSL 节点 → 映射 JSON（`ref`/`id`/`controlType`/`parent`/pageAbsX/pageAbsY/w/h/attrs）；公共栏节点保留审计记录但不进入页面映射。
3. Group 语义用 `classify-mastergo-groups.js` 的 role，再经 `mtslg-iocontrol-map.json` roleMap 定 ControlType；不得用相机/按钮实例在有效相机组件外重复搭建内部控件。
4. `gen-iocontrol-xml.js --merge <现有XML> <mapping.json> --out <已确认页面输出路径>` → 读 merge 报告，逐条裁决冲突。
5. `check-iocontrol-coords.js --xml <产出> --nodes <节点表>`：0 MISMATCH / 0 EXTRA。
6. 执行第 6 节键查证门禁，处理全部未核验键。
7. `sync-to-mt.ps1` 按适配记录同步到唯一已确认的运行配置目录；同步前强制备份。
8. 在目标运行宿主中切到目标页，执行已确认的页面重载动作，再截图核对（第 8 节）。
9. 通过后留档：记录页面源文件、设计链接、边界表、映射、验证证据与待人工项；版本控制提交由用户决定。

### 7.3 路径 B：新建页面（可选）

1. `gen-iocontrol-xml.js --fresh <mapping.json> --out <Name>Page.xml`（根节点自动生成 NaN 骨架）。
2. **页面注册固定模板**：目标项目存在 Layout 时，按其已确认注册结构添加页面 Target 与菜单入口；目标项目缺少 Layout 时，按 `feishu-layout-mapping.md` 的正式模板创建 Layout 文件，并仅写入已确认字段。示例模板：`<Page Target="{target}" LangName="{page_title_key}"/>`；菜单项只有在 `PageName="Jump:{target}"` 等字段已有项目证据时才填入。改写已有文件前备份；新建文件记录为新产物。
3. **语言键**：在目标项目要求的每种语言资源中成对添加 `{page_title_key}`；语言文件的编码、重载与重启要求以适配记录为准。
4. 坐标核对 → 同步 → 执行目标项目已确认的重载动作。
5. **风险闸**：Target→文件名映射部分在闭源代码，首次必须人工验证加载；失败则回退「改现有页面」路径并报告。

## 8. 验证方法

静态（生成后立即）：
- `check-iocontrol-coords.js`：0 MISMATCH、0 EXTRA（容差 0.5px）。
- 键白名单校验（手动/生成器报告交叉核对）。
- XML 可解析、无重复 ID、根节点 NaN 正确。

运行时（目标项目重载动作 + 截图）：
1. 切到目标页，执行适配记录中的重载动作，并等待目标项目完成加载。
2. 使用 `cap-window.ps1` 或目标项目认可的截图方式，传入已确认的运行宿主与输出路径。
3. 坐标换算：以适配记录中的目标客户区尺寸为基准；若运行时存在缩放，记录客户区原点与缩放系数后再逐区比对。
4. 按 DSL bbox 裁剪关键区逐区对照；没有可视化通道时，可用像素采样、ASCII 粗渲染、UI Automation 或间隔截图像素差异确认页面稳定性与关键控件位置。
5. 检查目标项目要求的语言环境中 LangName 生效，且 IOEnable/IOVisible 无缺键报错。

## 9. 风险与实测待办

- **首次项目验证项**：确认客户区尺寸与缩放、页面重载的焦点与时机、同名页面文件的加载优先级；结果写入项目适配记录，不回填为本手册规则。
- 版本控制：改动前备份；提交、合并和推送由用户确认后执行。
- 如果存在重复部署副本，必须由适配配置和运行宿主确认唯一生效目录。
- 布局分组（无控件语义的 Group）：可以在 mapping manifest 中保留原始层级，但最终可加载的 IOContorl XML 不得输出运行时不识别的无 `ControlType` 容器；应展平到最近有效父容器并重算子坐标，或使用映射表中已确认的容器 ControlType。根组件 `rootContainer.overflow=hidden` 时必须保留等价外层裁剪边界。
- 新产出不得新增缺少必需语言翻译或未通过键查证的 LangName。

## 10. 脚本索引（scripts/）

| 脚本 | 用途 | 模式 |
|---|---|---|
| `gen-iocontrol-xml.js` | IOContorl XML 发射器（--fresh / --merge） | 新 |
| `check-iocontrol-coords.js` | 页面坐标逐控件核对（0 MISMATCH 硬门） | 新 |
| `scan-mtslg-keys.ps1` | 键白名单生成（styles/icons/langNames 成对/pageTargets/ioCommands/ioNames） | 新 |
| `sync-to-mt.ps1` | 安全同步：备份+回滚+拒绝副本路径+svn 摘要 | 新 |
| `classify-mastergo-groups.js` | Group 名称→语义 role 分类 | 双模式共用 |
| `cap-window.ps1` / `cap-window2.ps1` | 截图验证（运行宿主与输出路径由适配记录提供） | 双模式共用 |
| `gen-mtslg-page-icons.js` | 从当前设计稿 PATH/SVG 和逐项图标映射自动生成当前页面 Icon 文件 | 双模式共用 |
| `convert-to-responsive.js` | 响应式 HTML（可选产出） | 双模式共用 |
