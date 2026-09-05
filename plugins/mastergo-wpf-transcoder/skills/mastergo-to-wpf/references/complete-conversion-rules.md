---
name: mastergo-to-wpf
description: 将明确要求的 MasterGo 设计稿转换为 MW WPF/XAML、C# UserControl 或 MTSLG IOContorl XML，并按正式组件库实例和目标框架规范生成完整代码；仅在同时包含 MasterGo 设计来源与转换/生成意图时触发，不用于单独修改 XML、排查 Ctrl+R、普通 WPF 调试或单独讨论 MTSLG/IOContorl/API/代码索引。
---

# MasterGo → 自适应 WPF（默认整页 Viewbox 等比 + 内层 Grid 星号布局）+ 响应式 HTML

## 触发边界

本 Skill 的自动触发条件是“MasterGo 设计来源 + 转换为 WPF/XAML/C#/XML 的明确意图”同时成立，例如 MasterGo 链接、`fileId + layerId`、MasterGo 页面截图/节点与转换要求同时出现。

仅出现以下内容时不要自动触发本 Skill：

- 单独修改已有页面 XML；
- 单独执行或排查 `Ctrl+R`；
- 普通 WPF 页面调试、布局调整或控件编写；
- 单独讨论 MTSLG、MaxwellFramework、IOContorl 的 API；
- 单独讨论组件库或代码索引，但没有 MasterGo 转代码请求。

`MTSLG`、`IOContorl`、`Ctrl+R`、`Common\\Pages` 和 `framework.config.json mode=iocontrol` 只用于已经触发本 Skill 后选择输出模式，不能单独作为触发条件。

## 完整转换硬性契约

凡是用户要求“MasterGo 转 C#/WPF/XAML”，默认必须交付完整转换：

### 最终页面优先（不可降级）

用户没有明确要求“原型、临时稿、测试稿、骨架或局部验证”时，任务从第一步就按最终页面交付标准执行。`test.xml`、`draft.xml`、`prototype.xml`、临时图片引用、占位控件和近似布局不得作为交付物，也不得先替换生产/测试页面再以“后续完善”收尾。中间映射 JSON、节点表和诊断文件可以内部生成，但必须在最终页面交付前完成组件、样式、图标、绑定、坐标和运行验证。

最终页面交付前必须完成以下门禁：

1. 先盘点目标项目实际组件库：全部可用 `ControlType`、框架控件、Style、Icon、LangName、容器类型、输入/选择/相机组件及现有页面先例；不能只看到 MasterGo 节点名称就直接生成普通 `Button`、`Border`、图片或 SVG。
2. 对每个 MasterGo 的 `INSTANCE`、组件名称、组件文档、变体状态和父子布局建立“设计节点 → 组件库组件 → IOContorl 属性”的映射；优先使用真实组件和真实样式，组件内部的图标、状态、交互和布局不得被图片背景替代。
3. 如果组件库没有明确匹配的组件、样式、图标或交互协议，必须暂停生成最终页面并向用户确认：新增到组件库、选择已有近似组件，还是只保留静态显示/待人工绑定。未获得确认不得擅自降级或捏造键值。
4. 只有 XML/工程完整、组件映射无未决项、键值校验通过、同步成功、重载成功且视觉核对通过，才能报告“完成/已交付”。任一门禁未通过，只能报告“未完成/阻塞”和具体缺口。

**禁止的交付话术与行为**：不能先交一个“临时测试稿”让用户自己测试，再把后续组件匹配、视觉修正和绑定当作另一个阶段；不能因为页面能加载、XML 能解析或截图有内容，就声称完成最终转换。

### 结构映射稿与项目运行时交付的边界

用户只要求独立的 IOContorl XML 文件时，可以在没有目标项目的情况下生成结构映射稿。此时仍必须使用现有正式组件映射表生成 `ControlType`、固定组件层级、槽位、文本和坐标；未确认的 `IOName`、`IOCommand`、`LangName` 和资源键只能留空、写 XML 注释或记录在 mapping manifest 中。不得因为缺少项目配置而输出普通 `Button`、无 `ControlType` 容器、空的伪控件或近似布局。

只有用户要求部署、替换现有页面、Ctrl+R 加载或报告可运行时，才把目标项目配置、实际页面样例、资源键和运行目录作为强制前置。结构映射稿不得描述为运行时已完成。

- 必须读取并处理设计稿总览和全部 section DSL，不能只读取 section 列表或少量节点。
- 必须覆盖所有属于页面业务范围的可见节点：Frame、Group、Instance、Text、Path/SVG、分隔线、装饰层和状态层；框架公共外壳节点必须在映射表中标记为“框架负责、页面不生成”，不能静默遗漏。
- 必须使用每个 section 的 page-absolute bbox、每个子节点的相对坐标、宽高、颜色、渐变、边框、圆角、阴影、透明度、字体和文本对齐信息；不能用 UniformGrid、平均分配、默认居中或猜测间距替代真实布局。
- 必须参考目标项目的完整组件库和所有相关现有页面先例；MasterGo 中命名为“按钮”“相机”“下拉框”“输入框”“容器”等节点，必须结合组件实例语义、位置、父子布局和组件库能力选择真实 `ControlType`，不能按名称直接降级成图片或通用控件。
- 设计稿的绝对 bbox 先归一到业务内容区坐标。旧模式再转换为与项目源码一致的比例 Grid；新模式则在内容区坐标内按父子相对坐标 1:1 写入 IOContorl。
- 必须保留设计稿中的所有真实文本和状态，并禁止添加 DSL 中没有来源的文本、数字、品牌名或装饰。
- 每个 Path/SVG 必须使用该节点自己的真实 svgShortKey/Geometry；不能用手绘简化图标、通用占位图标或复用其他节点图标。
- 旧模式必须输出可编译的完整工程或可嵌入的完整 UserControl，并执行 build、启动和视觉核对；新模式必须完成 XML 校验、同步、重载和视觉核对；不能把“近似布局”“示意原型”“先做骨架”当作完成结果。
- 若完整 DSL、SVG 资源或正式组件映射无法获取，必须明确标记为“未完成/阻塞”；若仅缺少运行环境，结构映射稿仍可交付，但必须把运行时绑定和加载验证标记为未完成。任何情况下不得降级为近似布局后声称已完成。

“近似布局”“视觉原型”“基础骨架”“先做个差不多的 Demo”只有在用户明确要求这些交付物时才允许；即使用户要求纯原生 WPF，也只替换控件实现和程序集依赖，不能降低设计数据覆盖率。

**模式与交付形态**：新模式（mode=iocontrol）的"完整转换"交付物 = 页面 IOContorl XML（全部业务节点在内容区坐标内 1:1 落位）+ 键白名单校验通过 + 同步成功 + Ctrl+R 可见；无 build、无 C#、无资源字典。旧模式交付物不变（可编译工程 + 视觉核对）。

## 模式选择（先定模式再开工）

### 生成前框架索引核对（公共 Skill）

公共版本优先使用 `mw-framework-index` 完成项目、`framework.config.json`、源码根、索引根、版本指纹和页面宿主核对。索引 Skill 输出的路径绑定/Profile 是本次生成的输入；没有确认的项目或框架路径时不得继续生成。索引不可用时，按本 Skill 的项目适配初始化流程询问用户，不得回退到 Skill 内写死的机器路径。

本 skill 支持两种产出模式，开始任何转换前必须先判定（判定顺序，命中即停）：

1. **项目配置优先**：读工作目录 `framework.config.json` 的 `mode` 字段。
   - `"mode": "iocontrol"` → **新模式**（MTSLG IOContorl 绝对坐标页面 XML，产物落项目目录、同步到 MT 运行目录）
   - `"mode": "wpf"` 或缺省 → **旧模式**（自适应 WPF XAML，本文件其余章节）
2. **用户明示次之**：IOContorl / 页面XML / 界面设计器 / MTSLG / MaxwellFramework / Ctrl+R 重载 / Common\Pages / PageDesign → 新模式；XAML / UserControl / Viewbox / Grid 星号 / 自适应拉伸 / 可编译工程 → 旧模式。
3. **默认旧模式**（不破坏存量使用），同时提示用户可写 `framework.config.json`（`"mode": "iocontrol"`）切新模式。

### 项目适配器首次初始化与复用（通用路径）

目标项目的源码、资源库、组件目录和页面样例不是 Skill 固定内容。首次进入一个没有适配配置的项目时，必须按 [references/project-adapter-initialization.md](references/project-adapter-initialization.md) 扫描候选目录，向用户确认框架模式和路径，再在目标项目内生成/更新 `framework.config.json`、`docs/ai-index/`、组件目录和资源键目录。不得把项目绝对路径或私有资源复制进本 Skill。

后续任务默认复用已确认配置；只有配置失效、索引缺失、源码指纹变化或用户明确要求重新扫描时才刷新。更换同一框架下的资源库/主题/样式集合只刷新项目索引，不新建 `references/adapters`；只有页面格式、ControlType、属性协议、资源查找或运行生命周期变化时才新增框架适配器。

如果一个框架存在多份可复用样式库，读取 [references/style-library-profiles.md](references/style-library-profiles.md)：框架 adapter 只保留一套，样式库按稳定 ID 和不可变版本作为 Profile 管理；项目在 `framework.config.json` 中绑定 Profile 与版本。发现多个候选且没有绑定时必须询问用户，禁止按目录顺序或时间戳自动选择；升级必须新增版本并保留旧版本，禁止原地覆盖。

| 维度 | 新模式（MTSLG IOContorl） | 旧模式（自适应 WPF） |
|---|---|---|
| 产物 | `{Name}Page.xml`（内容区绝对坐标，页面设计尺寸由目标框架配置决定） | `XxxView.xaml` + 资源字典（内容区 Viewbox + Grid 星号） |
| 坐标 | 先归一到内容区，再按 bbox → Left/Top/Width/Height 直传 | 先归一到内容区，再按 bbox → `x*/w*/r*` 星号权重 |
| 运行 | 同步到 MTSLG Config 目录 → 运行程序 Ctrl+R 重载 | dotnet build + 启动 |
| 控件 | 统一 `<IOContorl>` + ControlType，Style/Icon/LangName 全部引用框架已有键（禁止捏造） | 每种控件一个标签，资源自生成 |
| 详见 | 文末「新模式（MTSLG IOContorl）速览」+ `references/adapters/mtslg-iocontrol/mtslg-mode.md` | 本文件其余章节 |

## 组件库模式（MasterGo 组件实例 → MW WPF）

当用户明确要求使用 MW/MasterGo 组件库，或设计稿主要由正式 `INSTANCE` 组件组成时，启用本模式；不要把它当成普通图层还原。

组件库模式的主链路是：

```text
正式组件实例
→ 组件名/布局/状态/设计属性
→ 项目组件登记表
→ MW 控件 + Style + Resource/Geometry
→ WPF/XAML 或 MTSLG IOContorl
```

项目中存在时，必须读取项目内的 `docs/mastergo-component-library-to-wpf-guide.md`（若项目提供）。该文档与本 Skill 的关系是：本 Skill 负责路由和执行门禁，项目文档负责当前 MW 组件的具体名称、属性和证据。公共 Skill 不绑定某个机器的项目绝对路径。

### 组件库模式的硬规则

**强制前置阅读：**进入 MasterGo 组件库映射或生成 WPF/MTSLG 页面前，必须先读取 [MasterGo → MTSLG 组件映射规则](mastergo-component-mapping-rules.md) 和 [飞书组件库映射标准完整副本](adapters/mtslg-iocontrol/feishu-component-library-mapping.md)。前者定义不可违反的匹配原则，后者保存当前完整组件模板和参数映射；两者均不得绕过或自行改写。生成结构映射稿时，目标项目代码框架、控件目录、Style/资源键和真实页面用于可选核对和运行时字段补全；生成项目可运行页面时才是强制前置。

### MasterGo 组件映射匹配键（强制）

组件映射必须使用“父节点语义 + MasterGo 变量属性名 + 变量值”作为唯一匹配键。变量值负责切换组件集中的固定实例模板。组件集名称、组件集 ID、实例 ID 和设计师自定义名称只能用于追踪和证据，不能写入匹配规则，也不能作为生成代码的分支条件。

匹配顺序固定为：

1. 读取父节点语义（例如“右侧栏”）。
2. 读取公开变量属性名及变量值（例如“按钮类型=startstop”，表示切换到上下布局实例）；语义名称不能替代真实变量值。
3. 用完整键命中固定模板，得到固定的 `ControlType`、节点数量、父子关系和 `Style`。
4. 只把 MasterGo 节点实际提供的文本、图标、状态、坐标、尺寸、字体等填入花括号字段；可选属性不存在时删除对应 XML 属性。

例如：`父节点=右侧栏 + 按钮类型=startstop` 必须映射 `ControlType="IconButton"`、`Style="UpDownRightButtonStyle"`；同一父节点下按钮类型为其他真实值时映射 `Style="RightButtonStyle"`。不能把“上下布局”等语义描述替代 MasterGo 实际变量值，也不能因为某个组件集 ID 曾经对应某个样式，就把该 ID 当成通用规则。

独立父节点必须独立匹配：例如 MasterGo 节点名称为“主菜单button”、父节点语义为主菜单时，按主菜单规则映射 `ControlType="IconButton"`、`Style="MainButtonStyle"`，不能套用右侧栏的 `RightButtonStyle` 或 `UpDownRightButtonStyle`。若主菜单变量属性和值未读取到，不得自行补写变量名或变量值。

如果父节点或属性值不足以唯一命中模板，必须标记“未匹配/待确认”，不得按组件名称、图层 ID 或外观猜测。

1. 优先识别正式组件实例、组件集、变体、布尔属性、文本属性、实例切换和受控插槽；普通矩形/文字不能仅凭外观转换成 MW 控件。
2. 组件名 + 布局变体 + 状态必须能唯一命中登记表；命中失败时报告未登记组件，不得静默生成普通 WPF `Button`。
3. 组件语义属性与页面几何属性分开：布局/状态/文本/图标决定代码映射，实例宽高/位置/间距用于页面布局，不改变控件和 Style 身份。
4. 生成代码时引用真实 MW 控件、Style、Geometry/Resource Key；不得把组件内部模板、颜色、图标路径复制成页面私有实现。
5. `IOEnable`、`PageName`、`s:Action` 等工程协议属于 AI/工程映射层，只有需求或工程配置明确提供时才生成，不作为普通设计师视觉属性猜测。
6. 组件映射必须同时验证设计属性、MW 源码/索引证据、资源键、运行页面；仅凭 MasterGo 截图、XML 可解析或画布有内容不能宣称映射完成。

### 与原始 DSL 模式的边界

- 正式组件实例：走组件库映射，优先使用登记的 MW 控件和 Style。
- 未登记的业务组合容器：回到原始 DSL 的父子结构和几何转换流程，但必须标记为待登记/待确认。
- 普通 Frame/Group/Text/Path：仍按原始 DSL 模式处理，并继续执行完整节点覆盖、资源和坐标验证门禁。
- 页面既有组件实例又有原始图层时，分别处理，不能把两种输入混成一个猜测链路。

## 公共外壳与页面坐标适配（两种模式通用）

MasterGo 设计稿可能同时包含页面业务内容和框架公共外壳。转换前必须先按目标框架的职责边界拆分二者；不能把公共外壳的坐标、尺寸或缩放值硬编码到页面产物中。

- 顶部公共栏和底部公共栏属于框架外壳，不生成到页面 XML/XAML；只有用户明确要求将其作为当前页面业务内容实现时才纳入转换。
- 左侧导航、右侧公共操作栏及其他框架级区域同样不属于页面内容，是否剥离以目标框架的实际宿主定义为准。
- 页面坐标原点是业务内容宿主的左上角，而不是完整窗口的左上角。
- 对纳入页面的节点，先转换到内容宿主局部坐标：`PageX = MasterGoX - ContentOriginX`、`PageY = MasterGoY - ContentOriginY`；宽高和父子相对坐标按同一局部坐标系保留。
- `ContentOriginX/ContentOriginY`、内容区尺寸和缩放策略必须从目标框架/宿主运行时发现或配置读取，不能从某个项目案例复制固定数值。
- 如果宿主按设计画布尺寸承载页面，页面保持 1:1；如果宿主尺寸不同，由适配层根据内容区尺寸计算缩放，不能在每个控件上分别乘固定比例。
- 页面 XML/XAML 不得通过添加公共栏占位控件来“补齐”窗口坐标，也不得因为公共外壳而修改 MasterGo 节点之间的相对布局。

### MTSLG 公共栏识别与坐标归一门禁（强制）

在新模式生成 IOContorl 之前，必须先建立“公共栏/页面业务区”边界表，并得到目标宿主证据；不能只根据 MasterGo 节点所在的 x/y 位置猜测职责。

1. 先从目标框架页面宿主、Layout 配置和现有页面运行截图确认内容区矩形 `ContentRect`，记录顶部公共栏高度、底部公共栏高度，以及左右区域是否由宿主负责。
2. 对 MasterGo 的顶部公共栏和底部公共栏节点，默认标记为“框架负责、页面不生成”；不得把顶部/底部背景、标题栏、状态栏、底部快捷键区复制进页面 XML。只有用户明确要求页面独立实现时才改变此结论。
3. 左右区域不能套用“公共栏”默认结论：若目标框架确认左右区域属于当前页面业务区，必须保留其中的按钮、面板和交互控件；若确认由宿主统一提供，才标记为“框架负责、页面不生成”。
4. 对保留节点执行一次性坐标归一：`PageX = MasterGoX - ContentOriginX`、`PageY = MasterGoY - ContentOriginY`。例如顶部公共栏高度为 `126` 时，业务节点的 `PageY = MasterGoY - 126`；不能继续使用完整窗口坐标，也不能对每个控件分别猜偏移。
5. 归一后必须检查：页面标题是否落在业务区顶部、相机/主面板是否落在业务区、右侧业务按钮是否仍在可视内容区、底部公共栏节点是否没有重复出现。将被剥离的 section/node id 写入映射表，不能静默遗漏。

**MTSLG 默认交付规则**：顶部公共栏和底部公共栏不生成；左右栏按目标宿主职责逐侧判断。若没有完成这张边界表和 `ContentOriginX/Y` 证据，不能生成最终页面 XML，也不能用运行时截图中的整体窗口坐标反推页面坐标。

## 结构化优先：为什么转换能成功

MasterGo 的结构化 DSL 是几何和语义的唯一事实来源；截图只能作为最终运行检查，不能作为量尺寸、猜布局或反复调坐标的依据。开始写 XAML 前必须建立可追溯的中间映射表，至少包含：`sectionIndex`、节点 `id/name/type`、父子路径、page bbox、相对 bbox、文本来源、颜色/效果、`svgShortKey`、目标 WPF 元素、资源键和覆盖状态。新模式映射表额外含：目标 `ControlType`、`ID`、业务属性（`IOName`/`IOCommand`/`PageName`/`Style`/`Icon`/`LangName` 等，须键查证后填写），格式即 `gen-iocontrol-xml.js` 的映射 JSON。

完整转换的必要参考输入按优先级排列如下：

1. MasterGo 总览、全部 section DSL 和每个真实 SVG 资源；只拿设计稿缩略图或少量节点不能支撑完整转换。
2. 目标项目的 `framework.config.json`、`docs/ai-index`、控件源码、样式、资源和真实页面示例；必须确认控件的真实属性和模板。
3. 质量较好的旧页面只能提供可复用的架构模式，例如“外层按钮 + 卡片内部比例 Grid + 独立 Icons.xaml”；它不是当前设计稿的视觉事实，也不能直接复制其文案、坐标或图标。
4. WPF 运行约束，包括 DrawingImage 的呈现方式、XAML 资源合并、字体、DPI 和程序集可用性。

转换时应先区分框架外壳与业务内容，再把业务内容拆成真实的大区、卡片内部比例子网格和逐节点 SVG 资源；不能用 UniformGrid、默认居中、重复图标或截图猜测来补齐空白。

## 框架控件与原生 WPF 的适配边界

> **本节仅适用于旧模式（自适应 WPF XAML）。** 新模式的控件语义见文末「新模式（MTSLG IOContorl）速览」。

先确认项目是否真的存在完整的 `IconButton`、`MainButtonGrid` 或等价控件。若源码已确认控件模板提供 `TopLeftContent`、`Content`、`Icon`、图标尺寸及 Hover/Pressed/Selected/Disabled 状态，应替换整个原始按钮内部，而不是只保留 `<Button ...>` 开头：

```xml
<s:IconButton Grid.Row="3" Grid.Column="3"
              Style="{StaticResource MainButtonStyle}"
              TopLeftContent="F2"
              Content="手动操作"
              Icon="{StaticResource 手动操作Geometry}"
              IconWidth="55" IconHeight="66" />
```

若私有程序集或控件不可用，才生成原生 WPF 等价适配器；适配器必须保留同一语义接口（标签、标题、图标、状态、布局槽位），不能借机降级为普通空 `Button`、`Border` 或截图背景。框架接入与原生兜底只是控件实现不同，设计节点覆盖率和比例布局不变。

## 资源职责必须分离

> **本节仅适用于旧模式（自适应 WPF XAML）。** 新模式相反：页面 XML 零资源定义，颜色/样式/图标全部引用框架键（Style/Icon/LangName），键必须查证。

无论接入真实框架还是生成原生 WPF 版本，都必须保持与源码框架相同的资源职责边界，不能把所有资源摊平到页面 XAML 或一个总字典中。开始转换前先读取当前项目实际目录和命名；若项目没有对应目录，则按以下职责创建等价结构：

| 职责 | 独立资源文件/目录 | 允许内容 |
|---|---|---|
| 颜色 | `Colors.xaml` | 原始颜色和颜色 token |
| 画刷/渐变 | `Brushes.xaml` 或 `Brushes/` | SolidColorBrush、LinearGradientBrush、状态画刷 |
| 字体与字号 | `Fonts.xaml`、`Sizes.xaml` | FontFamily、FontWeight、字号、控件尺寸 token |
| 图标 | `Icons.xaml`、`Geometries.xaml` 或 `IconGeometry.xaml` | SVG、Geometry、DrawingImage、图标 Viewbox |
| 控件样式 | `Style/`、`Styles.xaml` | Button/IconButton 模板、状态触发器、布局样式 |
| 页面 | `Views/*.xaml` | 页面 Grid、语义控件和资源引用，不存放公共 token |

页面只能引用这些资源键，例如 `Background="{StaticResource StageBg}"`、`FontSize="{StaticResource TitleFontSize}"`、`Source="{StaticResource AlarmIcon}"`；禁止在页面中重复硬编码同一组颜色、字体、图标几何或公共渐变。若目标源码已有不同文件名，保持其真实命名和目录职责，不强行改名。交付前检查资源字典合并顺序、键唯一性和页面引用链。

## 资源和图标的可复用实现规则

- 每个设计节点优先绑定自己导出的 `svgShortKey`；不能因为图标相似就复用另一个节点的资源。
- 节点没有 `svgShortKey` 时，检查其子节点是否由矩形、路径、文字等基础层组成；应完整重建这些层，不能凭语义画一个“差不多”的图标。
- 单色 SVG 可抽成局部坐标的 `Geometry`，多色 SVG 保留多条局部 `Path`；页面使用 `Image Source="{StaticResource ...}"` 或框架控件的 `Icon` 属性。
- `DrawingImage` 不能直接作为普通 `ContentControl.Content` 期待它显示文字图像；这会出现运行时 `System.Windows.Media.DrawingImage`。使用 `Image.Source`、`ImageBrush` 或已确认的框架图标属性。
- WPF 不接受 MasterGo SVG 中的所有 CSS 颜色写法；生成资源时将 `rgba(r,g,b,a)` 规范化为 ARGB 十六进制，并在构建和启动时验证。
- 生成后扫描图标局部坐标，修复所有越界 Path；不要用 Canvas 裁切来掩盖错误。
- 新模式：图标不生成资源文件，直接引用框架 `Icon="XXGeometry"` 键。若目标架构确认 IOContorl 是同一 WPF 框架的 XML 封装并共享 SDC 资源字典，则 Style/Icon 键可直接以 SDC 源码的 `x:Key`/Geometry 为证据；否则只能以运行配置中的既有页面/白名单为证据。两种来源都必须记录在键目录中，禁止捏造。

## 结构化验证门（截图不是主验证）

在写页面和交付前，必须输出或检查覆盖统计：section 数量一致；所有可见节点均有 WPF 元素/资源；所有文本有 DSL 来源；每个 SVG key 与来源节点一一对应；Group 语义没有落入错误的 Canvas 分支；页面没有用 `ContentControl.Content` 承载 DrawingImage，也没有用 UniformGrid/默认居中替代真实相对坐标。随后执行 `dotnet build`、启动窗口并检查资源错误、窗口尺寸、DPI 溢出和空白区域。

截图是可选的最后一公里检查，只用来确认程序真的启动、资源真的渲染、DPI/裁切没有异常；不得根据截图反向猜节点结构，或在没有 DSL 对照的情况下宣布“完整转换”。

新模式放行条件：坐标 diff 0 差异（`check-iocontrol-coords.js`）、所有 Style/Icon/LangName/PageName 命中键白名单、同步已备份成功（`sync-to-mt.ps1` 日志）、Ctrl+R 后截图与 DSL 逐区对照通过。

## 源码比例布局优先级

> **本节仅适用于旧模式（自适应 WPF XAML）。** `x*/w*/r*` 公式只对旧模式；新模式在完成内容区坐标归一后才使用绝对坐标直传。

当目标项目已有页面源码采用比例布局时，必须优先复用该布局范式：

1. 页面分区：将设计稿的总宽高和大区 bbox 转换为 `Grid.RowDefinitions` / `Grid.ColumnDefinitions` 的星号权重。
2. 重复卡片：根据相邻元素之间的真实间隔生成“间隔列/卡片列/间隔列”，不能用 `UniformGrid` 平均切分。
3. 卡片内部：将子节点相对父节点的 `relativeX/relativeY/width/height` 转换为比例子行列；图标、文字和装饰层按各自相对位置放置，不能默认居中。
4. 固定像素例外：只对字号、1~2px 细线和明确的小交互件保留固定尺寸；位置仍然使用比例布局。
5. `Canvas` 和页面级 `Canvas.Left/Canvas.Top` 禁止作为最终页面布局方案；仅允许在图标内部承载 Path 几何。

绝对坐标到星号权重的转换公式：对父容器宽度 `P`，子元素左边距 `x`、宽度 `w`、右边距 `r=P-x-w`，生成 `x* / w* / r*` 三列；垂直方向同理生成 `y* / h* / b*` 三行。所有嵌套容器递归执行该转换。

把固定像素的设计稿转换为**随窗口/屏幕按比例拉伸**的 WPF UserControl。与 `mastergo-to-html`（静态 1:1 还原）互补：本技能的目标是可嵌入实际项目的自适应工程代码。

## 核心转换规则（先理解 why 再动手）

> **本节仅适用于旧模式（自适应 WPF XAML）。** 数字示例仅说明星号权重，不代表固定页面尺寸；新模式均不适用（无缩放转换，框架运行时负责显示）。

**整页等比缩放（强制默认）**：UserControl 外层用 `Viewbox Stretch="Uniform"` 包住内层 Grid（内层 Grid 显式使用业务内容区的设计宽高）；UserControl 本身不设尺寸，`Background` 与内层 Grid 同渐变（窗口比例与设计不同时留边无缝）。UserControl 不设尺寸是关键——设了 `SizeToContent` 或显式尺寸会把窗口锁成"固定画布"。详见「缩放策略」节。

**像素尺寸 → Grid 加权星号**：内层 Grid 中某业务内容区的 `126` 高区域可写成 `Height="126*"`。Grid 按权重比例分配空间——业务内容区设计尺寸下 1:1 还原，外层 Viewbox 保证任意窗口下整体等比不变形。这是全部布局规则的根基。

> **`126*` 里的 126 不是 126 像素，是权重分子**：实际尺寸 = 126 / 行权重总和 × 容器实际尺寸。设计分辨率下数字碰巧与像素 1:1，窗口放大 2 倍时该行自动变 252——没有任何固定长宽。列宽同理：图标 bbox（如 x116 宽 50 的图标在 180 宽按钮里）换算成 `50*` 列，代表 50/180 ≈ 27.8% 的按钮宽度。每个容器/控件的权重**按各自设计稿 bbox 单独换算**，不能用"相近元素的权重"代替——相近元素 bbox 不同（如 50/40/57 宽），套用同一套权重 = 按错误比例落位。

**固定不缩放的只有三类**（工控 HMI 惯例，理由：缩放后发虚或难点击）：
1. **字号**——固定 px，屏幕变大时留白增多（正确行为，不要试图缩放文字）
2. **细线条厚度**——1~2px 分隔线保持固定厚度，但线的**位置和长度必须按比例**（位置用星号/百分比，只有 width 或 thickness 固定）
3. **小交互件**——如 18×18 勾选框，尺寸固定、位置按比例

**图标**：转换产出的 `Viewbox Stretch="Uniform"` 资源放进 Grid 单元格即自动等比缩放，无需改动；但有坐标越界大坑，见下文「图标坐标检查」。

## 缩放策略（强制默认：整页等比 Viewbox，开工即按此交付）

> **本节仅适用于旧模式（自适应 WPF XAML）。** 新模式的绝对坐标 XML 无缩放三模式（框架运行时负责显示）。

**默认交付 = 模式 B（Viewbox 整体等比）**，除非用户明确提出其他要求，不主动给星号拉伸。用户对缩放体验的反馈会要求切换到另外两种模式——不要争辩"正确做法"，按反馈切换：

| 模式 | 结构 | 效果 | 何时使用 |
|---|---|---|---|
| **B Viewbox 整体等比（默认，强制）** | `Viewbox Stretch="Uniform"` 包住内层 Grid（内层保持比例星号不变，显式使用业务内容区设计尺寸） | 页面+字体一起矢量缩放、不变形不压缩；窗口比例与设计不同时留边（UserControl `Background` 与内层 Grid 同渐变，留边无缝） | **一切默认场景**；用户反馈"不是固定比例缩放/拉扁了/字体被压缩/挤在一起"时确认此模式 |
| A 星号拉伸+固定字号 | 纯比例 Grid，无 Viewbox 包装 | 填满窗口但横纵比例不同步；缩小窗口时字号不缩、文字可能溢出格子被高 z 序元素覆盖 | 仅用户明确要"铺满拉伸/不要留边/嵌入框架固定区域" |
| C Viewbox+窗口比例锁定 | 模式 B + 宿主窗口锁定为业务内容区的设计比例（AspectRatioLock，见 `references/portable-framework.md`） | 只能等比放大缩小；拖拽/最大化/贴靠全部锁比例，内容永远铺满窗口、无留边 | 用户说"只能等比放大缩小/拉伸会有空出来的部分/不要留边" |

**"要跟着电脑分辨率"必须先查清内容区与屏幕比例再动手**：业务内容区和屏幕比例不同时，"无留边 + 不变形 + 铺满"三者不可兼得（只能三选二）。用实际比例说明取舍；等比裁剪可能裁掉业务控件，优先推荐"等比留边（B）"或"比例锁定（C）"。

**模式 B/C 实现要点**：
- 内层 Grid 显式设计尺寸；UserControl 本身不设尺寸随宿主伸缩，`Background` 与内层 Grid 同渐变 → 留边无缝。
- 模式 C 的锁定代码要覆盖三条路：拖拽（WM_SIZING）、最大化（WM_GETMINMAXINFO）、贴靠/外部改尺寸（WM_WINDOWPOSCHANGING，鼠标按下时跳过交给 WM_SIZING）。
- 验证截图里的"窗口下缘几像素黑带"是窗口框架（不可见缩放边框），不是内容缺陷——先量客户区尺寸再下结论。

## 组件实例优先的控件语义（高于 Group 名称和几何外观）

不要根据“有边框、里面有数字”这类视觉外观猜测输入能力。先沿 MasterGo 选中节点向上检查是否存在**设计系统组件实例**：`INSTANCE`、组件名称、`_variantProps`、`componentDocumentLinks` 或可解析的组件链接。若链接选中的是该组件的容器或其内部层，整个实例仍按这个组件的语义处理；不能把内部的 `TEXT` 节点单独误判成输入框。

### 语义证据优先级（必须按顺序停）

1. **组件实例 + 组件文档/变体**：若节点或祖先是 `INSTANCE`，且组件名称、`_variantProps` 或 `componentDocumentLinks` 明确为 Input/TextField/NumberInput/Select/ReadOnly/Display 等，按其文档和变体映射。存在 `componentDocumentLinks` 时必须先调用 `getComponentLink`；文档比名称优先。
2. **组件实例 + 明确组件名称**：无文档但组件名明确为 `TextBox`、`NumberBox`、`ComboBox`、`TextBlock`、`Label` 等时，可按名称映射，同时在映射表记录 `semanticEvidence=component-name`。
3. **普通 Group 的名称**：只有节点及其祖先都不是可识别的组件实例时，才规范化 Group 名称（去首尾空格、转小写、把空格/下划线/短横线统一为分隔符）并按名称判断控件语义。
4. **纯容器或扁平图形**：FRAME/GROUP + TEXT/PATH/RECT，或导出的 SVG/Path，没有上述组件语义证据时，默认是布局/显示，不生成可编辑控件。内部单独的文字生成 `TextBlock`（新模式为显示型 `Label`/`TextBox` 时须由目标框架先例确认）；边框只生成容器外观。
5. **无法证明的读写能力**：不得因为数值、白底矩形或下划箭头就生成 `NumberBox`、可写 `TextBox`、`ComboBox` 或绑定写 IO。需要可编辑、可下拉、可写 IO 的结论必须来自步骤 1-3 的语义证据，或目标项目的业务/IO 先例；否则标记 `semanticEvidence=visual-only`、`interaction=unconfirmed` 并向用户确认。

映射表必须额外记录 `semanticEvidence`（`component-doc` / `component-variant` / `component-name` / `group-name` / `project-precedent` / `visual-only`）和 `interaction`（`editable` / `read-only` / `display` / `unconfirmed`）。不得把推断结果表述为 MasterGo 已确认的事实。

### 普通 Group 的识别顺序

1. 仅在“语义证据优先级”的前三步没有命中时，匹配更具体的复合名称：`iconbutton` / `icon-button`、`buttongroup` / `button-group`、`togglebutton`、`radiobutton`、`checkbox` 等。
2. 再匹配基础控件：`button`、`textbox`、`textblock`、`combobox`、`slider`、`progressbar`、`tab`、`menu` 等。
3. 一个 Group 名称包含 `button` 时，默认生成真正的 WPF `Button`（或项目明确提供的 `IconButton`），不能生成只负责绘制背景的 `Canvas`/`Border`。
4. 只有名称没有命中控件语义，且其子节点确实是布局分组时，才生成 `Grid`/`Border` 容器；其内部 TEXT 按显示文本处理。
5. 控件语义命中后，Group 的几何信息只负责布局和尺寸；视觉状态、圆角、边框、悬停/按下/选中状态从参考样式映射，不能把整个 Group 的截图当作一张背景图。

### 语义到 WPF 的最低映射

| Group 名称 | 首选 WPF 类型 | 参考样式方向 |
|---|---|---|
| `Button` | `Button` | `Button.xaml` / `ButtonBaseStyle` |
| `IconButton` | `Button` + `Viewbox`/`Path` 内容；若项目已有控件则用 `IconButton` | `IconButton.xaml` |
| `ButtonGroup` | `ItemsControl`/`StackPanel` + 多个 `Button` | `ButtonGroup.xaml` + ButtonGroupItem 样式 |
| `TextBox` | `TextBox` | `TextBox.xaml` |
| `CheckBox` / `ToggleButton` | 对应 WPF 控件 | `CheckBox.xaml` / `ToggleButton.xaml` |
| 未命名或普通布局 Group | `Grid`/`Border` | 只承担布局，不伪装成交互控件 |

生成代码时保留原始 Group 名称到注释、`x:Name` 或辅助映射表中，例如 `Group="MainButton"`，这样后续可以追溯设计稿节点和控件类型。

新模式下的 Group 语义 → IOContorl ControlType 映射见 `references/adapters/mtslg-iocontrol/mtslg-iocontrol-map.json`（roleMap），生成时由 `gen-iocontrol-xml.js` 消费；分类器 `classify-mastergo-groups.js` 输出通用 role 层，两模式共用。

## 参考 WPF 样式的使用边界

> `refence/SDC` 是 MW WPF 资源的源码边界。页面语法是否为 XAML 或 IOContorl XML，不决定资源能否共享；若目标架构确认 IOContorl 为同一 WPF 框架的 XML 封装，则 IOContorl 的 `Style`/`Icon` 同样可引用已加载的 SDC 键。ControlType、附加属性和行为协议仍必须按当前页面语法分别处理。

用户提供参考目录时，先扫描 `refence/SDC/Style`、`refence/SDC/Brushes`、`refence/SDC/Geometries.xaml` 和 `refence/ManualView.xaml`。优先复用其中的 Button、IconButton、ButtonGroup、IconControl、颜色、画刷和 Geometry 规范。

### `refence` 是框架源码边界（必须遵守）

如果目标项目提供 `refence/` 目录，应将其视为项目自研框架源码及真实使用示例的代码边界，而不是普通素材目录。转换和重构时必须先按照原目录拆解职责，再进行修改：

- `refence/SDC/Style/`：控件样式、派生样式和 `ControlTemplate`。
- `refence/SDC/Brushes/`：控件状态和视觉用途画刷。
- `refence/SDC/Colors.xaml`、`Brushes.xaml`、`Fonts.xaml`、`Sizes.xaml`：基础设计资源。
- `refence/SDC/Geometries.xaml`、`IconGeometry.xaml`：图标和 Geometry 资源。
- `refence/SDC/FrameworkGeneric.xaml`：框架级默认模板和通用样式入口。
- `refence/ManualView.xaml` 等页面：真实业务使用示例，不等同于控件定义。

禁止把 `refence` 中的样式、资源、控件模板和页面代码全部摊平到一个新文件，也禁止把业务页面示例误当成框架 API 定义。新增或修改代码时，应放回与现有职责相对应的目录，并保持资源引用、样式继承和框架命名空间关系；只有确认目标项目明确要求独立示例时，才允许生成脱离框架的纯 WPF 等价物。

## 自研框架代码导航（必须优先执行）

本 Skill 只记录通用转换流程，不保存任何具体项目的绝对路径、业务命名空间或私有源码内容。项目专属框架信息必须放在目标项目自己的 `docs/ai-index/` 和参考源码目录中。

开始 MasterGo 转 WPF 之前，**先按「模式选择」节判定模式**：项目 `framework.config.json` 的 `mode` 为 `"iocontrol"` 时，直接跳至文末「新模式（MTSLG IOContorl）速览」，不进入下面的框架发现流程。旧模式（含缺省）才按以下顺序发现框架（**任一步命中即停**）：

1. 目标项目目录下的 `framework.config.json`（读取 `source_root` 和 `index_root`）。
2. 项目内的 `docs/ai-index/framework-index.json`。
3. 项目文档、构建配置或用户提供的框架入口。无法发现框架时，明确标记为“框架能力未确认”，再决定是否按原生 WPF 处理；不得使用某台机器的固定路径作为兜底。

这些位置是项目自研框架能力的入口，用来避免重新发明已有控件、样式、资源或页面模式。

按以下顺序导航：

1. 读取 `framework.config.json` 指向的 `index_root/framework-index.json`，或项目内的 `docs/ai-index/framework-index.json`，根据设计稿需求匹配已有能力和候选文件。
2. 读取候选文件对应的 `files/*.json`，确认该文件的职责、包含内容、资源引用、示例和 `read_next`。
3. 读取 `capabilities/*.json`，确认该能力的推荐入口和真实示例。
4. 使用 `source-index.json` 中的 `source.anchors` 或文件级 JSON 中的锚点定位 `source_root` 下的原始 XAML/C#；索引摘要不是最终实现，原始源码才是事实依据。
5. 先复用现有框架能力，再生成新的 WPF 结构；只有索引和源码都确认没有对应能力时，才新增等价实现。

需求到框架能力的最低检查：

| 设计稿需求 | 优先检索 |
|---|---|
| 普通按钮 | Button 样式、ButtonBaseStyle、按钮状态画刷 |
| 图标按钮 | IconButton、IconButtonBaseStyle、IconButton 的真实页面示例 |
| 设备条件控制 | IOEnable、设备状态按钮示例；禁止自行发明表达式协议 |
| 页面跳转 | PageName、Jump 协议真实示例；禁止自行扩展跳转格式 |
| 数据表格 | DataGrid、IODataGrid、DataGridAttach |
| 数字/参数输入 | NumberBox、IntNumberBox、StringNumberBox、NumericKeypad |
| 下拉框 | ComboBox、MultiComboBox、DropDownElement |
| 颜色/主题 | Colors、Brushes、控件状态画刷、Fonts、Sizes |
| 图标 | Geometries、Icons、IconControl |

如果索引只确认了调用形式而没有控件 C# 实现，必须在转换说明中标记“待从完整框架源码确认”，不能把推断出的属性类型、默认值或运行时行为写成已确认事实。

### MW WPF 框架手册适配（发现即接入）

总 skill 自带的 `references/adapters/mw-wpf/` 是 MW WPF/XAML 的组件库与场景 adapter。旧模式命中 MW 框架时，必须先完整读取 `references/adapters/mw-wpf/mw-wpf-framework.md`，再按其中的 `framework-manual/` 路由到所需条目；实际项目的 `framework.config.json`/源码仍是属性和资源键的最终证据。

- **旧模式（WPF/XAML）**：必须先读 `02-controls/README.md` 建立可用控件/样式目录；再按设计语义读取 `04-scenarios/` 的对应场景（按钮、输入、下拉、数据展示、导航等）和具体控件条目。优先生成其确认的框架控件、样式、资源键及协议，禁止手写等效 Button/Grid/Path/位图结构。
- **新模式（MTSLG IOContorl）**：可使用该手册的场景名称将设计节点归类为通用语义（如 `action-button`、`numeric-input`、`selection`、`status-display`）。不得复制 WPF 标签、附加属性或事件协议；但当目标架构确认 XML 封装与 SDC 共用资源字典时，可将 SDC 的已验证 Style/Geometry 键写入 `Style`/`Icon`。最终仍只能依据目标 IOContorl 的组件目录与属性白名单，把语义映射为该框架实际支持的 `ControlType`。
- 两种模式都必须保留证据来源：MW 手册负责“WPF 控件应如何使用”的 P1/P2 证据；IOContorl 文档和既有 XML 负责“XML ControlType 及其属性”的事实。两者冲突时，以当前产物所属框架的权威文档为准。

转换完成后，如果修改了源码或资源，应重新运行项目提供的索引生成脚本，再检查 `framework-index.json`、文件级 JSON 和源码锚点是否仍然一致。

- 若参考样式依赖用户私有程序集/控件，独立示例仍使用纯 WPF 等价物保证可编译，并在注释中标明可替换的私有样式键。
- 不要把 `Button` Group 渲染成 Canvas；Canvas 只允许用于图标内部的 Path 几何，不能作为交互 Group 的根控件。
- 控件的 `Background`、`BorderBrush`、`CornerRadius`、`Padding`、`Foreground` 和状态触发器应来自参考样式或其等价实现。

## Icons.xaml 规范（重新生成前必须检查）

> **本节仅适用于旧模式（自适应 WPF XAML）。** `gen-icons-xaml.js` / `scan-icon-coords.js` 仅旧模式使用；新模式图标 = 框架 `Icon` 键引用（见新模式速览）。

Icons.xaml 必须是可独立合并的 `ResourceDictionary`：每个图标有稳定的 `x:Key`，根资源使用 `Viewbox Stretch="Uniform"`，内部画布尺寸等于图标局部坐标系，不能把页面绝对坐标直接塞进 Path。

- 单色图标优先使用独立的 `<Geometry x:Key="..." o:Freeze="True">...</Geometry>`，再由 `Viewbox` 内的单个 `Path Data="{StaticResource ...}"` 引用；`ResourceDictionary` 需要声明 `xmlns:o="http://schemas.microsoft.com/winfx/2006/xaml/presentation/options"`。多色图标可使用多个局部化 `Path`。
- 若 MasterGo 导出的 Path 仍是页面绝对坐标，先计算所有 Path 的最小 `x/y`，通过 `TranslateTransform` 平移到局部坐标，或重新写入归一化后的 Geometry；不能依赖越界的 Canvas 裁剪。
- 每次生成后运行 `node scripts/scan-icon-coords.js <Icons.xaml>`，任何 `<<< 越界` 都必须修复后再交付。
- 重新渲染至少检查一个 Button 图标、一个多路径图标和一个文本+图标控件，确认资源合并、尺寸、颜色和坐标都正确。

**用 `scripts/gen-icons-xaml.js` 从 extractSvg 落盘 JSON 批量生成 Icons.xaml**（手动转 SVG 必踩的坑都内置了）：

- `rgba(r,g,b,a)` → `#AARRGGBB`：**只有 alpha 乘 255，RGB 直接转十六进制**（RGB 也乘 255 会产生 8 位十六进制色值，如 `rgba(0,50,97,0.3)` 错成 `#4D0031CE`）。运行时验证再交付。
- SVG 默认 `fill-rule:nonzero`，而 WPF PathGeometry 默认 `EvenOdd` → 每个 Path 用 `<Path.Data><PathGeometry FillRule="Nonzero" Figures="..."/></Path.Data>` 显式声明。
- SVG 的 `transform="matrix(a,b,c,d,e,f)"` → `Path.RenderTransform` 的 `MatrixTransform Matrix="a,b,c,d,e,f"`（分量顺序一致）。
- viewBox 非零原点（页面绝对坐标图标，如 `viewBox="81 8 57 40"`）→ Canvas 的 `RenderTransform TranslateTransform(-x,-y)` 归零；scan-icon-coords 会因变换矩阵数值提示"人工确认"，核对偏移量后即可放行。
- 每个图标 `x:Shared="False"`——Viewbox 是 UIElement，默认共享会报"元素已是另一个元素的逻辑子级"。
- 图标内缺失的 LAYER 白底矩形用生成器的 `layers` 配置补 `<Rectangle>`。

## 数据获取

- 用户给 MasterGo 链接 → 按 `mastergo-to-html` 技能的 MCP 流程取数：`getDesignSections` 无 sectionIndex 先拿总览（rootMetadata/splitContainers/allTexts），再逐个拉全部 section DSL。**每个元素记录：page-absolute bbox、fill/_color、effect、borderRadius、字体、textAlign、text 节点自身宽度**。
- 已有静态转换稿（旧 html/xaml）→ 可复用其坐标，但**不要盲信**：旧稿本身可能有错。用户反馈"对不上"时，以线上 DSL 为准逐项核对（见「文字对齐」的真实案例）。
- 组件 vs 页面坐标：MasterGo 组件实例可能放在页面 y=1 等偏移处，组件内部坐标会比页面坐标整体小 1px——这是实例偏移，不是数据错误。
- **extractSvg 结果很大时**（几十 KB 起）MCP 结果会自动落盘到会话的 tool-results 目录并给路径——不要在上下文里手抄 SVG，用 `scripts/gen-icons-xaml.js` 直接读落盘 JSON 生成 Icons.xaml。
- **svgShortKey → extractSvg 条目映射规则**：DSL 里节点的 `svgKey` 形如 `S5:名称|…/父节点id/本节点id`；extractSvg 每个条目带 `id` 字段，其值 = svgKey 里**倒数第二段（父节点 id）**。按父节点 id 尾段映射即可拿到该图标的 composite SVG。
- **composite SVG 不包含 LAYER 矩形**：`hasStrippedSvgs` 的设计里，图标内部的白底矩形等 LAYER 层不会进 composite（只有 PATH 会）。生成前用脚本算每个 svg 内 path 的 bbox 与 DSL LAYER 子节点比对，缺哪个补哪个（生成器支持 `layers` 补丁配置）。
- 无 svgKey 的 PATH 数据在 DSL 里是空的（`data:""`），只能靠 extractSvg 的 composite 恢复；若 composite 也缺，标记"未完成"而不是手绘。
- 新模式：bbox 是唯一布局输入——先按「公共外壳与页面坐标适配」规则把节点归一到业务内容宿主，再记录 content-page bbox；每个子节点使用 `Left=absX−parentAbsX`、`Top=absY−parentAbsY`，不把完整窗口外壳坐标直接写入页面；取数后核对 rootMetadata 与目标页面设计画布尺寸，若页面区域或画布不符先确认，不得用控件级猜测修正全局错位。

## WPF 骨架模式（对齐 AutoCutView 风格）

> **本节仅适用于旧模式（自适应 WPF XAML）。** 新模式的骨架是 `<?xml ...?>` + 根 `<IOContorl ID="" Left/Top/Width/Height="NaN">`，见新模式速览与 `references/adapters/mtslg-iocontrol/mtslg-mode.md`。

```xml
<UserControl x:Class="..."
             xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
             xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
             xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"
             xmlns:d="http://schemas.microsoft.com/expression/blend/2008"
             mc:Ignorable="d"
             d:DesignWidth="{StaticResource ContentDesignWidth}"
             d:DesignHeight="{StaticResource ContentDesignHeight}"
             Background="{StaticResource StageBg}">
  <!-- 缩放策略 B（强制默认）：整页等比；UserControl 不设尺寸，留边显示同渐变背景无缝 -->
  <Viewbox Stretch="Uniform">
  <Grid Width="{StaticResource ContentDesignWidth}"
        Height="{StaticResource ContentDesignHeight}">
    <Grid.RowDefinitions>
      <RowDefinition Height="126*"/>   <!-- 顶栏：设计稿行高原样加 * -->
      <RowDefinition Height="696*"/>   <!-- 中部 -->
      <RowDefinition Height="202*"/>   <!-- 底栏 -->
    </Grid.RowDefinitions>
    ...
  </Grid>
  </Viewbox>
```

- 交付 `XxxView.xaml`（UserControl，可嵌入用户框架）+ Window 仅作演示宿主。演示宿主禁止 `SizeToContent` 或给视图显式尺寸——会把窗口锁成"固定画布"。
- 页面只保留页面专属且不可复用的局部资源；公共样式、卡片渐变、阴影、颜色、字体和字号必须放入对应的独立资源文件，并由页面引用。
- **不要伪造用户私有框架的 API**（如他们内部的 IO 控件/命令/样式键）——那边编译验证不了。用纯 WPF 等价物保证独立可编译；但**可交互卡片必须是真 `Button`**（自定义 ControlTemplate 保留设计视觉：渐变/圆角/阴影 + 悬停提亮/按下变暗触发器），不能只用 Border/ContentControl 拼视觉——用户会反馈"只是画布不是按钮"。给可交互卡片加 `x:Name` 方便用户日后挂逻辑，逻辑本身留空。
- 单色 Geometry 按钮控件无法还原双色调多路径图标时，优先保视觉：Viewbox+Canvas/Path。

## 卡片/区域内部布局：比例子网格，禁止默认居中

> **本节仅适用于旧模式（自适应 WPF XAML）。** 整节 Grid 星号规则（切分顺序/Span/文字单元格/右对齐地标）新模式均不适用——新模式的相对位置直接由 bbox 差值给出。

绝对定位转换成 Grid 单元格后，单元格内部**继续用比例子行列**，不要图省事用居中或固定 Margin：

```xml
<!-- 图标在设计稿里 rel (78,8) 60×40，卡片 152×84 → 列 78* 60* 14*，行 8* 40* 8* 28* -->
<Grid.ColumnDefinitions>
  <ColumnDefinition Width="78*"/><ColumnDefinition Width="60*"/><ColumnDefinition Width="14*"/>
</Grid.ColumnDefinitions>
```

**为什么不能默认居中**：设计稿里图标经常是"故意右偏"的（如 rel x78 而非居中 x46），文字是"图标正下方居中"而非整卡居中。上一版实现因默认居中偏了 30px 被用户打回。逐元素计算 `元素坐标 - 卡片原点` 再决定行/列权重。

### 切分的唯一作用范围：独占行/列的组件必须 ColumnSpan/RowSpan 跨满（必须遵守）

容器里"上面一个组件、下面两个组件"时，列切分**只作用于需要分列的下面那一行**；上面独占的组件用 `ColumnSpan` 跨满整个横向比例，视觉上等于"上面没切"。禁止因为"同一容器有分列"就把独占组件也塞进某一列、或再给它竖切一刀。左右结构同理（`RowSpan`）。

判断依据是设计稿每个节点的实际 bbox：独占组件 bbox 覆盖了下方两列的范围 → 跨满；只有设计稿本身把元素画成局部宽度（如右对齐到 143 的半宽标题）时，才照 bbox 落列，不强行跨满。

### ❌ 禁止：切分延伸到不需要分列的独占区域

```xml
<!-- 下面两个组件分了 1:1 两列, 上面的独占面板也被硬塞进其中一列(或切成两半各占一列) -->
<Grid>
  <Grid.ColumnDefinitions>
    <ColumnDefinition Width="1*"/><ColumnDefinition Width="1*"/>
  </Grid.ColumnDefinitions>
  <Border Grid.Row="0" Grid.Column="0"/>            <!-- 独占面板被挤进左列, 右侧留空 -->
  <Border Grid.Row="1" Grid.Column="0"/>
  <Border Grid.Row="1" Grid.Column="1"/>
</Grid>
```

### ✅ 必须：独占组件跨满, 切分只到需要分列的行

```xml
<Grid>
  <Grid.ColumnDefinitions>
    <ColumnDefinition Width="1*"/><ColumnDefinition Width="1*"/>
  </Grid.ColumnDefinitions>
  <Border Grid.Row="0" Grid.ColumnSpan="2"/>        <!-- 上面独占整个横向比例, 等于没切 -->
  <Border Grid.Row="1" Grid.Column="0"/>
  <Border Grid.Row="1" Grid.Column="1"/>
</Grid>
```

### 布局划分顺序：父→子递归切分，控件只填充单元格（必须遵守）

1. **划分顺序必须是 父容器 → 子容器 → 控件**：先按页面级大区切父容器行/列，再对每个子容器（卡片、按钮、面板）内部分细，最后才放控件。填充每个布局时对照该布局下子控件的实际 bbox 复核划分，发现不符就回头调整划分。
2. **控件只填充在单元格内**（跨列/跨行用 Span），不存在悬空定位——按比例缩放时控件永远跟着单元格走，**错位只可能来自划分本身与设计稿几何不符**，排查错位就是排查划分。
3. **同层级先拆列、区域内堆叠再拆行，递归到每个控件独占单元格**：如按钮整体=竖两列（左字体、右图标）；某列内还有"上图标+下字体"就再横切两行。切分只到需要切的那一层，独占者用 Span 跨满（见上节）。
4. **比例一律按设计稿原始整体坐标换算权重**（控件 bbox 相对最近容器），禁止按局部猜测、禁止把形状相似的其他按钮/卡片的列结构直接复用——同一页面里相似按钮的图标 bbox 可能各不相同（如 48/50/40/57 宽、x 116/118/126/109），必须各自按自己的 DSL 坐标划分。
5. **字体也在布局单元格内、随页面同比缩放**：Viewbox 模式 B 下整页（含字体）统一等比，字体不独立设缩放、不溢出单元格。

### 文字节点的单元格 = 其设计稿 bbox（必须遵守）

每个 TEXT 节点必须落在**按它自己的 bbox 换算出的单元格**里，对齐方式按 bbox 落地：

- left → 单元格左缘 = bbox 左缘；right → 单元格右缘 = bbox 右缘；center → 单元格中心 = bbox 中心。
- 禁止把文字塞进"看起来差不多"的相邻单元格——右对齐标签的右缘是硬地标（同一面板的标签右缘常对齐同一条线，如 135/143），差一格就整体错位（真实案例：右对齐标签落在 36 宽单元格 → 右缘差 59px）。
- 多字标签（中文每字 ≈ 字号 px）单元格宽度必须 ≥ 文字宽度，不够就 `ColumnSpan` 跨足（见"启用等待"截断案例）。
- 左对齐文字允许向右侧空单元格溢出（WPF 不裁剪），但相邻有控件时必须按 bbox 落位防覆盖；右对齐/居中对齐的单元格必须与 bbox 一致，溢出会偏向错误方向。

### ❌ 禁止：右对齐标签放进宽度不足或错位的单元格

```xml
<!-- 设计稿标签 bbox 40..135 右对齐, 却放进 40..76 的单元格 → 右缘差 59px, 整行标签错位 -->
<TextBlock Grid.Column="1" Grid.ColumnSpan="2" Text="最后一步步距" HorizontalAlignment="Right"/>
```

### ✅ 必须：按标签自己的 bbox 落列, 右缘与地标对齐

```xml
<!-- 列 [40,95,16,160,...]: 标签 col1(40..135) 右对齐, 右缘 135 与同面板其他标签对齐 -->
<TextBlock Grid.Column="1" Text="最后一步步距" HorizontalAlignment="Right"/>
```

### ❌ 禁止：相似按钮复用同一套列结构

```xml
<!-- 页面里 3 个同款按钮, 但设计稿图标 bbox 不同(50宽@x116 / 40宽@x126 / 57宽@x109),
     全都套用同一套列 [8,6,104,48,14] → 后两个按钮的图标错位 8~9px -->
<Grid.ColumnDefinitions>
  <ColumnDefinition Width="8*"/><ColumnDefinition Width="6*"/><ColumnDefinition Width="104*"/>
  <ColumnDefinition Width="48*"/><ColumnDefinition Width="14*"/>
</Grid.ColumnDefinitions>
```

### ✅ 必须：每个按钮按自己的图标 bbox 换算出自己的列宽

```xml
<!-- 图标 bbox 50宽@x116 → 列 [8,6,102,50,14]; 40宽@x126 → [8,6,112,40,14]; 57宽@x109 → [8,6,95,57,14] -->
<Grid.ColumnDefinitions>
  <ColumnDefinition Width="8*"/><ColumnDefinition Width="6*"/><ColumnDefinition Width="102*"/>
  <ColumnDefinition Width="50*"/><ColumnDefinition Width="14*"/>
</Grid.ColumnDefinitions>
```

**文字对齐的真实字形边缘计算**：DSL 的 `textAlign` 作用于 **text 节点自身宽度**（不是父 group 宽度）。
- right 对齐：字形右缘 = group.relX + text.width（不是 group 的右缘！）
- center 对齐：字形中心 = group.relX + text.width/2
- WPF 里用 `HorizontalAlignment="Right" Margin="0,0,{卡片宽-右缘},0"` 或等效比例列实现。

**XAML 语法坑**：`Grid.RowDefinitions` 属性元素必须写在 Grid 子内容**之前**，混在中间会报 MC3088。

## 图标坐标检查（必做）

> **本节仅适用于旧模式（自适应 WPF XAML）。** 新模式的对应检查是 `check-iocontrol-coords.js`（页面坐标逐控件核对，见新模式验证）。

转换产出的图标资源里，个别 Path 的 Data 可能是**页面绝对坐标**未归一化（如画布 57×40 但路径画在 x81~138）——Viewbox 按画布尺寸缩放，路径落在画布外 → 渲染冲出卡片或完全不可见。HTML 侧 SVG 有 viewBox 天然正确，**此坑只在 WPF/XAML 侧**。

每次转换后运行扫描脚本：

```bash
node scripts/scan-icon-coords.js <Icons.xaml>
```

输出每个图标的画布尺寸 vs 路径数值范围，标 `<<< 越界` 的需要修复。修复方式：给 Path 加平移变换归零（不改路径数据本身）：

```xml
<Path Data="M81,10.86..." Fill="#003261">
  <Path.RenderTransform><TranslateTransform X="-81" Y="-8"/></Path.RenderTransform>
</Path>
```

注意 MatrixTransform 矩阵里的数值不是绘图坐标（如旋转矩阵的平移分量），不要误判。

## 响应式 HTML（可选产出）

若已有绝对定位静态 HTML，用机械转换脚本把所有定位 px 改为相对父级的百分比（与星号布局数学等价）：

```bash
node scripts/convert-to-responsive.js <input.html> <output.html> <stageW> <stageH> \
  --keep-thickness divider --keep-px-classes chk \
  --class-rules ".fcard:1280:1024,.fcard .flabel:180:180,.fcard .ficon:180:180,.fcard .ftitle:180:180,.hcard .hlabel:100:100" \
  --class-sizes "fcard:180:180"
```

- `.stage` 的宽/高改为 100%，body 保留原字体/背景只改布局；字号保持 px。
- 脚本要点（已内置）：正则带 `(?<![\w-])` 防止把 `line-height` 里的 `height` 误转；尺寸写在 class 而非内联的元素要登记进 `--class-sizes` 供子元素换算；`--keep-thickness`（细线：只固定厚度，位置/长度转 %）和 `--keep-px-classes`（勾选框：宽高都固定，位置转 %）语义不同，别混用。
- 无静态稿可转换时，按 WPF 同样的比例结构手写 CSS Grid（`grid-template-rows: 126fr 696fr 202fr`）。

## 旧模式验证（必须做）

> 本节仅适用于旧模式。新模式的验证见紧随其后的「新模式验证」节。

### 完整性放行门

在使用“完成”“已转换”“可交付”等表述前，必须逐项确认：

1. section 总数与已获取的 section DSL 数量一致；
2. 所有可见 Text/Path/Frame/Group/Instance 节点都有对应 WPF 元素或资源；
3. 所有设计稿文本都能追溯到 DSL，未引入未授权文本；
4. 所有图标都绑定了自己的真实 Geometry/SVG，未使用近似图形；
5. 设计分辨率截图与 MasterGo 设计稿逐区对照，至少检查顶部、主卡片、底部和右侧区域；
6. 若任一项未满足，只能报告“未完成”及缺口，不能把部分实现描述为完整转换。

1. **编译前关掉运行中的 exe**——否则 MSB3027 文件锁失败。
2. `dotnet build` 0 错误后 `dotnet run` 起窗口。
3. **DPI 感知截图**（用户的机器可能是 150% 缩放，普通截图只能截到窗口的 2/3）：用 `scripts/cap-window.ps1 -ProcName <进程名> -Out <png> [-Crop "x,y,w,h"]`，脚本先调 `SetProcessDPIAware`，把窗口移到屏幕内再截；用 `-Crop` 裁出争议卡片区域放大对比设计稿。**若截图被终端/其他窗口遮挡**（黑色大块区域），用 `scripts/cap-window2.ps1`（PrintWindow + PW_RENDERFULLCONTENT，可截被遮挡窗口）。
4. **像素采样验证**（Read 工具不支持显示图片时的替代方案）：已知客户区原点 (ox,oy) 与缩放系数 k 后，采样设计坐标关键点比对预期色值。注意：1px 细线在分数缩放下会抗锯齿混合（允许 ±2 色差）；ClearType 文字像素会偏色（黑字可能采到 `#935E00` 这类条纹色）——文字区只验证"有深色像素"即可。
5. **控件位置验证**：UI Automation 按 `AutomationId`（即 x:Name）查 `BoundingRectangle`，能精确定位"控件跑错列/塌缩"类问题（比逐像素找快得多）。
6. HTML：起本地 http 服务（Playwright 拦 file://），分别在**设计分辨率**和**一个宽屏分辨率**（如 1920×1080）截图，确认 1:1 还原 + 比例拉伸、无横向滚动条。
7. 逐项核对清单：骨架行高 / 卡片坐标 / 图标位置（注意右偏图标）/ 文字对齐边缘 / 渐变与阴影 token / 分隔线颜色左右顺序。

**构建/运行高频坑**（编译通过但运行崩/视觉错）：

| 坑 | 症状 | 修法 |
|---|---|---|
| `CornerRadius="{StaticResource X}"` 且 X 是 `sys:Double` | 编译 0 错误，运行 XamlParseException"CornerRadius 无效值" | 资源改成 `<CornerRadius x:Key="X">8</CornerRadius>` 类型 |
| 顶对齐 Border 放进纯星号行 | 高度塌缩到内容期望值（如 102px 面板只剩 50px） | 去 VerticalAlignment 让它 Stretch，或把行权重算到与内容一致 |
| `SizeToContent` + 无尺寸 UserControl | 窗口塌缩成内容最小尺寸 | 演示宿主给视图显式业务内容区设计尺寸，或干脆不用 SizeToContent |
| HwndSourceHook 用 lambda | CS1001（lambda 不能带 ref 参数） | 用 `delegate(IntPtr h, int m, IntPtr w, IntPtr l, ref bool handled)` 匿名方法 |
| Viewbox 图标资源未加 `x:Shared="False"` | 运行时"元素已是另一个元素的逻辑子级" | 生成器统一加 |
| **Viewbox 整页缩放 + 小号文字** | Viewbox 会把子内容**光栅化后再重采样**，非整数缩放下 CJK 文字可能丢失底部笔画，用户报"文字被吞掉/被遮挡/文字没有自适应" | **文字多的页面用 RenderTransform 等比缩放替代 Viewbox**：外层 Grid 承载 + 内层业务内容区设计尺寸的 Grid（`RenderTransformOrigin="0,0"`）+ `SizeChanged` 里 `ScaleTransform(k,k)` + `Margin` 居中留边。验证方法：RenderTargetBitmap 自渲染输出 PNG 逐行比对字形（屏幕截图受窗口遮挡干扰，不可靠） |
| 星号行高度 < 字号（缩小窗口后） | 文字溢出格子、被高 z 序元素覆盖 → 用户说"字体被压缩" | 切换到缩放策略 B/C（整体等比） |
| 按钮模板 ContentPresenter 设了 `HorizontalAlignment/VerticalAlignment="Center"` | 按钮内部星号 Grid **塌缩成内容尺寸并居中**：图标/文字全部漂移、互相叠压，用户报"图标上的 F 键/文字被遮住" | ContentPresenter 必须保持默认 Stretch（不要显式 Center），内部 Grid 才能铺满按钮 |
| 字号大的文字放在过小的星号行里 | 20px 字号放在 8px 高的行 → 文字不渲染或不可见 | 给文字足够行高：如工控 F 键按钮行结构 [8,24,16,8,16,12]（F 键 24px 行 y=8..32、图标跨行 y=8..48、标签 y=56..72），行高按设计稿 relY 精确切分 |
| 文字放在网格第 0 列、没有按设计稿 relX 内缩 | 文字顶到按钮左缘/圆角上，用户说"F 字样被压缩" | 按设计稿 relX 落列（如 F 键 relX=8 → 放第 2 列起），每个文字节点的 x/y 内缩都要转成对应的行列 |

## 常见反馈-根因速查

| 用户说 | 大概率根因 |
|---|---|
| "图标没对齐/冲出卡片" | 图标 Path 绝对坐标未归一化 → 跑 scan-icon-coords.js |
| "文字位置不对" | textAlign 作用域算错；或默认居中但设计稿是右偏/图标下方居中 |
| "整体是静态的" | 还在用 Canvas/绝对定位 → 本技能核心规则 |
| "不是固定比例的缩放" | 没包 Viewbox Uniform（默认应为模式 B）→ 检查骨架 |
| "只是画布/不是按钮" | 卡片用 Border 拼视觉而非真 Button → 换 ControlTemplate Button |
| "固定画布/窗口不能缩放" | UserControl 显式尺寸或宿主 SizeToContent 锁死窗口 |
| "截图只截到一部分" | 高 DPI 机器没调 SetProcessDPIAware |
| "字体被压缩/挤在一起" | 缩小窗口后星号行小于字号，文字溢出被高 z 序元素覆盖 → 切换缩放策略 B（Viewbox 整体等比） |
| "拉伸时会有空出来的部分/留边" | Viewbox 留边 → 切换缩放策略 C（窗口比例锁定 AspectRatioLock） |
| "要跟着电脑分辨率" | 先查业务内容区与屏幕实际比例；比例不一致时"无留边+不变形+铺满"三选二，举数字说明 |
| "窗口很小/塌缩" | SizeToContent + 视图无固定尺寸 |
| "编译过了运行崩" | CornerRadius 资源类型 / x:Shared / 模板运行时错误 → 查上表构建运行坑 |
| "标签文字被截断/中断" | 单元格列宽小于文本宽度（多字中文标签每个字≈字号 px，12 字 16px ≈192px 塞进 91px 单元格）→ 按文本宽 ColumnSpan 给足宽度 |
| 验证时截图全黑/全是别的窗口 | 应用窗口被终端等其他窗口遮挡（屏幕截图拍到遮挡物）；PrintWindow 对 WPF 也可能全黑；窗口位置每次启动可能不同 | 用 UI Automation 验证：按 `AutomationId`（x:Name）/Text 名查 `BoundingRectangle`，不受遮挡影响；每次截图前先取得 `ContentRect`，再按内容区比例换算 |
| （新模式）重载没反应 | 页面 XML 未同步到程序实际读取的配置目录，或目标页未被程序加载 | 按项目提供的同步方式确认目标路径；切到目标页后按已确认的重载方式刷新 |
| （新模式）整体坐标偏移 | 页面内容区画布假设不符，或内容区/父容器原点算错 | 先核对框架内容区和设计画布尺寸，再用归一后的节点表执行 `check-iocontrol-coords.js` |
| （新模式）样式/图标不显示（键不识别） | Style/Icon 未在共享 SDC 资源或运行页面键目录中验证，或 LangName 不在语言字典 | 键查证四步；无证据的键禁止使用 |
| （新模式）改完 IO 绑定丢了 | 整文件重写而非 merge | 改现有页面必须 `gen-iocontrol-xml.js --merge` |

## 新模式验证（必须做）

**静态（生成后立即，无程序依赖）**

1. `check-iocontrol-coords.js --xml <页面> --nodes <节点表>`：0 处 MISMATCH、0 处 EXTRA（容差 0.5px）；
2. 键目录校验：Style/Icon 命中已确认共享的 SDC 资源键或运行页面键目录；LangName/PageName 分别命中语言字典/页面注册目录（查不到 → 禁止使用/留空标注）；
3. XML 可解析、无重复 ID、根节点 `ID="" Left/Top/Width/Height="NaN"`。

**运行时（Ctrl+R + 截图）**

1. 确认 `MaxWell.Client` 运行中并切到目标页 → 按 Ctrl+R 等约 1 秒重载（PageDesign.ReLoaded）；
2. `cap-window.ps1 -ProcName MaxWell.Client -Out page.png`（被遮挡时用 cap-window2.ps1）；
3. 先排除框架公共外壳，取得页面内容区 `ContentRect`；若内容区尺寸等于页面设计画布则 `k=1`，否则按 `k=min(ContentWidth/DesignWidth, ContentHeight/DesignHeight)` 记录换算说明；
4. 按 DSL bbox 裁剪关键区（按钮行/GroupBox/右侧按钮）逐区对照设计稿；
5. 检查 LangName 生效（中文环境）、IOEnable/IOVisible 无缺键报错。

## 新模式（MTSLG IOContorl）速览

> 完整手册：`references/adapters/mtslg-iocontrol/mtslg-mode.md`。本节只放开工必读的摘要；ControlType 属性以目标项目提供的界面设计器文档为准。

## 新模式：组件目录、使用场景与代码风格（先完成，后生成）

不得把 MasterGo 的节点直接翻译成 `Image`、截图或任意 SVG。开始生成/合并 IOContorl XML 前，必须先完成下列两份只读基线；任一份缺失时，只能报告“控件映射待确认”，不能以图片替代业务控件。

### 1. 目标组件目录（必须覆盖全部可用 ControlType）

1. 读取目标框架的界面设计器/控件库文档，列出全部 `ControlType`、嵌套能力、每种控件允许的属性、代码示例和 UI 示例。
   - 旧模式命中 MW 框架时，还必须以 bundled adapter 的 `references/adapters/mw-wpf/framework-manual/02-controls/README.md` 和 `04-scenarios/README.md` 补充组件目录与需求→控件选型；不能只依赖名称分类器。
2. 扫描目标项目的现有页面 XML，补充每个 ControlType 的真实使用组合：父容器、相邻标签、Style/Icon/LangName 键、IO 属性和布局模式。文档的“控件能力”与既有页面的“业务用法”必须分开记录，不可互相臆测。
3. 形成项目内的 `component-catalog`：`ControlType`、适用语义、允许属性、可嵌套性、文档证据、既有页面证据。候选为空时，明确标记为“组件库未覆盖”，再向用户确认是否允许等价实现。

### 2. 设计节点到已有控件的选择流程（必须逐节点执行）

1. 先读取 MasterGo 的组件实例/名称/变体/文档；普通 Group 仅在没有组件语义时按名称处理。
2. 结合节点的父子关系和布局，查询 `component-catalog` 选择已有控件：例如操作触发区优先 Button/IconButton/StatusButton，视频或视觉采集区优先 Camera 系列，选项及下拉箭头组合优先 ComboBox，参数编辑区优先 NumberBox/TextBox，静态文案优先 TextBlock，带标题的边界区域优先 GroupBox/Border。
3. 对每个映射记录 `semanticEvidence`、`catalogEvidence` 和 `exampleEvidence`。只有三者中的语义和目录均成立时，才生成控件及其白名单属性；业务 IO 绑定仍按 merge 纪律保留或标记待人工绑定。
4. `Image` 只可表达设计稿本来就是位图/图片内容；SVG/Path 只可表达真实图标或纯装饰。它们可以放进已确认的 Button/IconButton 等控件，不得替代按钮、下拉框、输入框、相机、表格或其他组件库已有控件。

### 3. XML 代码风格（新建与触及节点必须遵守）

- 使用 UTF-8 无 BOM、XML 声明、4 个空格缩进；一个属性一行；自闭合节点写成 ` />`，容器使用独立开闭标签。
- 属性按稳定顺序书写：`ID`、`ControlType`、业务/显示属性、位置尺寸属性；不把完整节点压成一行。
- 改现有页面时，未触及的节点和注释逐字节保留；被 merge 修改的节点沿用所在文件的既有格式。若文件风格与上述规范冲突，先报告并由用户决定是否做独立格式化，不在设计转换中顺带重排全文件。
- 旧模式 XAML 同样先读取目标源码的命名、资源拆分、缩进和属性换行方式；禁止生成与项目现有风格不一致的一行式 XAML。

**框架事实**
- 页面 = `{Name}Page.xml`，根与子节点统一 `<IOContorl>` 标签，`ControlType` 区分控件；官方拼写为 **IOContorl**（无字母 e）。
- 绝对坐标：`Left/Top/Width/Height` 使用归一后的页面内容区设计坐标；页面设计尺寸、允许的小数/NaN 和重载方式以目标项目配置为准；子控件相对父容器左上角。
- 页面位置、运行进程名和重载快捷键必须从目标项目配置或既有页面流程确认，不能在通用 skill 中写死。
- MTSLG `DataGrid` 的 `Value` 属性必须存在，且最终页面必须填写非空、可解析的数据文件名。完全省略 `Value` 会在 `IODataGrid.LoadDataSource` 中触发空引用；`Value=""` 只能作为诊断/待绑定中间态，不能通过最终交付门禁。此规则仅针对 `DataGrid`，不得推广到 `RadioButton` 等其他 ControlType。

**坐标规则**
- 先将业务节点转换到页面内容区，再按相对父容器坐标写入：`Left = absX − parentAbsX`、`Top = absY − parentAbsY`，Width/Height 原样；无宽高省略属性；NaN 按目标框架规则保留。
- 无 Viewbox、无缩放、无星号数学。坐标与检查全交给 `gen-iocontrol-xml.js` + `check-iocontrol-coords.js`。

**merge 三条铁律（改现有页面，当前主路径）**
1. 几何按设计稿更新（`gen-iocontrol-xml.js --merge` 自动做）；
2. 现有 XML 的业务属性（IOName/IOCommand/PageName/Style/Icon/LangName…）一律保留，冲突只报告不覆盖；
3. 设计稿新增的节点才新增；现有但设计稿无的节点原样保留。

**键查证四步（禁止捏造）**
1. Style/Icon：目标架构确认共享 SDC 资源时，须以 SDC 源码中真实 `x:Key`/Geometry 为证据，并可用现有 XML 作为运行先例；未确认共享时，才要求其他页面 XML 或 Layout.xml 先例。键目录记录证据来源；
2. LangName：x:Key 须在 `MaxWellClient_CN.xaml` **与** `_EN.xaml` 成对存在；新键双文件各加一条；
3. PageName `Jump:X` 的 X 须在 Layout.xml `<Page Target>` 集合内；
4. IOName：查 `Config\<平台>\Io\` 或现有页面先例；查不到 → 留空 + 注释「待人工绑定」，不编造 `CTC.xxx`。
①-③ 不通过 → 禁止使用该键，向用户要键或人工加键。

**同步纪律**
- 产物先落目标项目指定的生成目录，再按项目提供的同步方式复制到运行配置目录；覆盖前必须备份，不自动提交版本控制。
- Layout.xml 注册与语言键改动走人工确认（共享注册表，改前备份）。

**工作流两条路径**
- 改现有页面（主路径）：取数 → 建映射 → `gen-iocontrol-xml.js --merge` → `check-iocontrol-coords.js` → 键查证四步 → `sync-to-mt.ps1` → Ctrl+R → 截图核对。
- 新建页面（可选）：`--fresh` 生成 → Layout.xml 注册 `<Page Target>` → 语言键成对添加 → 同步 → Ctrl+R；首次需人工验证加载（Target↔文件名映射部分在闭源代码，`IOViewPage.xml` 未注册 Layout.xml 却能加载即是证据）。

## 可移植性

项目源码只能作为本地转换输入，不能直接沉淀到 Skill、示例或交付物中。XAML、C#、业务文案、真实 MasterGo 链接和图层 ID、私有程序集、命名空间、资源路径和 Style 名称，只能留在本地项目或本地日志。

需要复用时，先提炼为“规则 + 中间表示 + 适配层”，再写入 `references/portable-framework.md` 或通用脚本。共享内容必须使用占位符、合成 JSON 和伪代码；不得复制可直接运行的业务页面。交付给其他人时只交付通用 Skill、脚本、脱敏参考和 adapter 接口，不交付真实 adapter、资源或原始项目文件。

通用名称分类器位于 `scripts/classify-mastergo-groups.js`，用于验证 `Button`、`IconButton`、`ButtonGroup` 等 Group 不会落入 Canvas 分支。完整的可移植中间表示和共享前检查清单见 `references/portable-framework.md`。

键白名单（`docs/mtslg-keys.json`）、IO 变量名、页面文件名、真实 Target 等属项目数据，只存项目目录，不进 skill。

本文件夹自包含：SKILL.md 以相对路径 `scripts/xxx` 引用脚本，整个文件夹可整体拷贝到任何兼容 Agent Skills 规范的 agent 技能目录（如 opencode `~/.config/opencode/skills/`、Codex `~/.codex/skills/`），或在任意 agent 的 AGENTS.md/指令文件里写入本 SKILL.md 的路径指针使用。
