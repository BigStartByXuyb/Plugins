---
name: mastergo-to-wpf
description: 将明确要求的 MasterGo 设计稿转换为 MW WPF/XAML、C# UserControl 或 MTSLG IOContorl XML，并按正式组件库实例和目标框架规范生成完整代码；仅在同时包含 MasterGo 设计来源与转换/生成意图时触发，不用于单独修改 XML、排查 Ctrl+R、普通 WPF 调试或单独讨论 MTSLG/IOContorl/API/代码索引。
---

# MasterGo 转 MW 代码

本 Skill 负责 MasterGo 设计稿到目标项目代码的完整转换。必须区分“按正式映射表生成结构”与“接入目标项目并完成运行时交付”：前者可以在没有目标项目时生成带待绑定标记的静态映射稿；后者才必须先使用 `mw-framework-index` 完成项目、框架、源码、索引、版本和页面宿主核对。

## 触发边界

必须同时满足：

1. 有 MasterGo 设计来源：链接、`fileId + layerId`、设计稿截图或结构化节点；
2. 用户明确要求转换/生成 WPF、XAML、C# UserControl、WinUI 或 IOContorl XML。

仅出现以下内容时不要触发：单独修改已有 XML、单独排查 `Ctrl+R`、普通 WPF 调试、单独讨论 MTSLG/IOContorl API、单独维护组件库或代码索引。

## 开始前门禁

先判断交付目标：

- **结构映射稿**：用户明确要求输出独立的 WPF/XAML/IOContorl 文件，但未提供目标项目时，按正式映射表生成结构、节点、槽位、来源和坐标；运行时绑定与资源键写入待确认清单，不得用猜测值补齐。
- **项目运行时交付**：用户要求替换/部署/加载页面，或要求报告可运行、Ctrl+R、视觉一致时，才执行以下目标项目门禁：
  1. 读取并确认 `mw-framework-index` 输出的项目路径绑定和框架 Profile。
  2. 读取目标项目的 `framework.config.json`，按配置选择 `mw-wpf` 或 `mtslg-iocontrol`。
  3. 确认框架源码、索引、组件库、真实页面样例和输出目录。
  4. 按页面宿主确认公共外壳边界。IOContorl 顶部栏/底部栏默认不生成 XML；WPF 是否生成公共栏取决于宿主是否负责。

无论哪种交付目标，组件只要命中正式映射，就必须按映射生成；只有完全没有匹配项时才暂停并询问新增、修改、近似替代或静态保留，未经确认不得用通用控件、无类型容器或视觉相似组件降级。

## 映射表优先级与适配层级

正式组件映射表是“组件结构”的最高优先级。匹配键优先为“独立组件集名称 + MasterGo 公开变体/属性名 + 真实属性值”；只有设计明确存在父子组合关系时才使用“父节点语义 + 公开属性名 + 真实属性值”。组件集 ID、实例 ID、图层名称和截图外观只用于追踪或辅助读取，不能替代匹配键。

按以下层级执行：

1. **正式映射表**决定 `ControlType`、`Style`、节点数量、父子关系、槽位顺序和固定属性。
2. **目标项目源码/真实页面/键索引**决定 `IOName`、`IOCommand`、`LangName`、已登记的 `Style`/`Icon` 和其他运行时字段。
3. **MasterGo DSL**为映射槽位提供真实文本、实例属性、图标来源、尺寸和逐级坐标。
4. 图层名称、组件名称和视觉外观不得触发额外推断；没有映射的组件不得静默改成 `Button`、`Border`、无类型容器或其他近似控件。

结构映射稿与运行时交付的边界如下：目标项目缺失时仍必须完成已有映射覆盖的结构转换，但必须将未确认的绑定、资源键和运行时行为标记为待配置；不得把“静态 XML 可解析”描述为“页面已完成”。

## 两个输出适配器

### `mw-wpf`

直接使用项目真实的 MW 控件、Style、Resource、Geometry 和协议写法，例如 `s:IconButton`、`MainButtonStyle`、`PageName`、`s:Action`、`IOEnable`。禁止用普通 WPF 控件替代已有 MW 能力，所有资源键必须回到源码或真实页面验证。

### `mtslg-iocontrol`

生成真实 `IOContorl` XML：`ControlType`、固定组件层级和槽位首先使用正式映射表；目标项目只用于确认 XML 属性白名单、Style/Icon/LangName、IOName/IOCommand 和运行时键。没有目标项目时不得把已命中的组件降级为普通 Button、无类型容器或静态占位结构。不要把 WPF 私有协议直接写入 XML。顶部/底部公共栏节点必须记录为“框架负责、页面不生成”。

## 组件和映射原则

- 使用一份组件语义映射，并按组件登记 `targets.mw-wpf` 与 `targets.mtslg-iocontrol`；正式映射存在时严格按映射表，不得凭外观、Group 名称或截图猜控件。
- WPF 控件、Style、资源和协议以源码/真实页面为事实源；IOContorl 的组件结构和 `ControlType` 以正式映射表为事实源，目标项目运行时资料用于核对属性、资源键和绑定。
- 组件实例优先于原始图层；未登记的业务组合必须标记待确认。
- 未确认的运行时字段只能写入 mapping manifest 或 XML 注释，禁止把“待人工绑定”作为可见 `Value`、伪造 `IOName` 或伪造 `IOCommand`。
- 设计稿中顶部栏、底部栏和其他公共外壳按宿主边界剥离；保留节点统一换算到内容区坐标，并记录被剥离节点。

### 独立输入框组件集（当前规则）

- `输入框` 是独立组件集，不再默认归入“左标题+右信息”嵌套结构。
- `输入框-整数-40/36/32` → `IntNumberBox`；`输入框-小数-40/36/32` → `NumberBox`；`输入框-文字-40/36/32` → `TextBox`。
- 标题、单位和说明文字等文本节点固定生成 `TextBlock`。
- `40/36/32` 只决定该实例的 `Height`，不改变 `ControlType`；当前项目默认使用高度 40。

### 输入框与下拉框真实父子结构

- 完整输入框的真实链为：`COMPONENT_SET 输入框` → `COMPONENT 变体` → `INSTANCE 变体` → `FRAME 外框/容器` → `FRAME 内层输入区域` → `TEXT 固定文本框`。映射到 MTSLG 时，输入框本体生成一个控件节点；内层 Frame 只表达真实外框、填充、边框和裁剪，不得凭视觉再增加一层父控件。
- 整数和小数输入框的外框实例高度分别为 40/36/32，文本自身 bbox 高度为 18；文本相对纵向位置随变体 padding 变化（40/36/32 对应 11/9/7），不能将文本高度或字号写成外框高度。
- 文字输入框的真实链为 `COMPONENT_SET` → `COMPONENT 变体` → `INSTANCE 变体` → `FRAME 输入框` → `TEXT`，仍然只生成一个 `TextBox` 本体，不能把内部固定文本误判为独立页面控件。
- 下拉框的真实链为 `COMPONENT_SET 选择框` → `COMPONENT 变体` → `INSTANCE 变体` → `INSTANCE 选择框` → `TEXT + PATH 下拉箭头`。`TEXT` 和箭头属于下拉框内部结构；最终生成一个 `ComboBox`，箭头不得拆成独立 IOContorl。PATH 必须保留唯一 sourceRef/svgKey。
- 下拉框 40/36/32 的外框高度为 40/36/32，内部 padding 和子节点相对位置分别按 DSL 的 11/9/7、箭头纵向位置 15/13/11 读取；不得用 `FontSize=18` 推导任何 `Height`。

### 文本来源与 Value 绑定硬门禁

- 每个生成的 XML/XAML 文本控件必须绑定到唯一的 MasterGo `layerId`/DSL `ref`，并记录其真实 `sourceParent`、原始文本、文本槽位和最终输出属性；组件实例的 `ID`、语义名称、坐标方向或业务推测不能作为文本来源。
- `Value` 只能使用对应 DSL 文本节点的真实文本或已确认的运行时绑定字段。禁止因为 XML `ID` 含有 `X`、`Y`、`Label`、`Value` 等词，或因为控件位于某个视觉位置，就推断、替换或重命名文本；例如 `RelativePositionXLabel` 不得自动生成 `Value="X"`。
- 同一模板的每个实例必须分别读取文本覆盖和父子层级；相同 `componentId`、相同结构、相邻排列或截图文字不能互相借用。设计稿中的 `3:56338 → 镜头倍率` 与兄弟节点 `3:56367 → Y` 必须保持独立。
- 生成前执行“XML 节点 → 唯一 layerId/ref → 父节点链 → 原始文本 → Value/绑定字段”反向核对；任一项缺失、重复或冲突时，停止生成并标记待确认，不得用语义名称或坐标补齐。

### 坐标转换硬门禁（实例与全部子组件）

- 每个 MasterGo 实例、子实例、Frame、Group 和文本/控件节点都必须绑定唯一的来源 `layerId`（或 DSL `ref`），并单独记录 `sourceParent`、`pageAbsX/pageAbsY`、`relativeX/relativeY`、`Width/Height` 和最终 `Left/Top`；没有来源绑定的节点不得进入最终 XML。
- 页面根级和嵌套节点都必须先解析为各自的 MasterGo 页面绝对 bbox。嵌套父子链只用于核对来源和裁剪边界，不得把子节点相对坐标直接作为最终 XML/WPF 坐标；最终只执行一次已确认的页面公共偏移归一化。
- 即使多个实例拥有相同 `componentId`、相同结构、相同文本或相同变体，也必须分别读取并计算各自实例及其全部子节点坐标；固定模板只决定结构和语义槽位，不决定实例位置。
- 禁止根据文字语义、截图观感、相邻排列、组件模板、其他实例或“应该在这里”的布局习惯推断任何 `Left/Top`。设计稿数据与视觉观感冲突时，暂停并报告冲突。
- 生成前必须逐项核对“XML 节点 ↔ 唯一 MasterGo layerId/ref ↔ 父节点链 ↔ 页面绝对坐标”；语义名称或 `ControlType + 坐标` 只能用于诊断，不能作为最终绑定。

### 绝对坐标输出规则

- 每个最终输出的 IOContorl/WPF 控件都必须按照自身 MasterGo bbox 的 `pageAbsX/pageAbsY/Width/Height` 定位；`Left/Top` 不能由父容器尺寸、相邻控件、字体或视觉间距推算。
- 最终输出统一使用内容区绝对坐标：`Left = pageAbsX - contentOriginX`，`Top = pageAbsY - contentOriginY`。公共顶部栏、设计稿示例标题等偏移只在根级内容坐标归一化时扣除一次。
- 嵌套结构只用于表达真实父子关系和 `overflow` 裁剪边界；子控件的最终位置仍必须由自身页面绝对 bbox 计算，禁止把同一偏移重复加减。
- 输出前必须保留“输出节点 ↔ 唯一 layerId/ref ↔ 自身 bbox ↔ 最终 Left/Top”清单；任一控件缺少自身 bbox 时不得交付。

### 来源清单与不可交付门禁

- 生成 IOContorl XML 前必须建立逐节点 mapping manifest；manifest 必须同时包含从原始 DSL 机械提取的 sourceNodes。每条 sourceNodes 记录至少包含 ref、parentRef、pageAbsX/pageAbsY、relativeX/relativeY、width/height 和真实 text（文本节点）；每条输出节点记录至少包含 xmlId、唯一 sourceRef、sourceParent、sourceText（文本节点）、expectedLeft/expectedTop/expectedWidth/expectedHeight。
- 文本节点的 Value 必须机械复制 sourceText；valueSource 必须为 dsl.text。禁止用 XML ID、组件属性名、字段名、坐标方向、视觉位置、模板槽位或业务语义生成 Value。RelativePositionXLabel 不得生成 Value="X"。
- 坐标必须机械计算：`expectedLeft = pageAbsX - contentOriginX`，`expectedTop = pageAbsY - contentOriginY`；`Width/Height` 必须来自同一 sourceRef 的 bbox。禁止用 ID、相邻节点、截图观感、固定模板或“应该在这里”补坐标。
- 坐标空间必须明确：`sourceNodes` 永远保存 MasterGo 原始页面绝对坐标；所有输出节点统一使用内容区绝对坐标，公共栏/示例标题偏移只减一次；不得对嵌套节点再减父级坐标或把父级相对坐标当作最终坐标。校验器必须按此公式独立重算。
- 生成器必须在写文件前执行 scripts/validate-iocontrol-provenance.js；校验器不得把 nodes 中的 expected 值当作 DSL 事实，必须用 sourceNodes 独立重算。任何 sourceNodes 缺失、UNTRACKED、Value != sourceText、缺少来源字段、父节点缺失或几何不匹配都必须以非零状态失败。验证失败时禁止输出、覆盖或交付 XML。
- 禁止仅凭 XML 可解析、控件数量正确或肉眼看起来接近就宣称完成；必须保留 manifest 和校验输出作为交付证据。无法建立来源链时，停止并标记待确认。

### 组件尺寸、TextBlock 高度与示例标题过滤

- WPF 输出中的 `TextBlock`/文本显示控件，`Height` 优先取 MasterGo 真实文本节点或组件子节点的 `W/H`（bbox），不能用 `FontSize`、行高或组件元数据中的 `size` 代替；`FontSize` 只控制字形，不决定控件边界。
- MTSLG IOContorl 输出采用项目组件约定覆盖上述默认规则：由组件实例映射出的 TextBlock 标签、数值和单位，`Height` 取所属组件实例的实际高度；当前项目默认高度为 40，输入框的 36/32 变体使用对应高度。不能用 FontSize 替代 Height。
- `Height` 与 `FontSize` 是两个独立字段：前者是 IOContorl 布局边界，后者必须从 DSL 的字体样式 `styles.font_*/value/size` 读取；组件行高统一为 40px 不能成为省略字号的理由。生成前必须检查所有文本节点和文本承载控件是否已填 `FontSize`。
- MTSLG 组件的外层 W/H 仍用于页面布局；所有输出节点的 `Left/Top` 必须按自身页面绝对 bbox 计算，父子链只用于确认结构和裁剪边界，不能把相对坐标当作最终绝对坐标，也不能因为高度统一而改变坐标。
- 只有独立的、非组件实例映射的 MTSLG 文本节点，才按其自身 bbox 取高度；没有真实 bbox 时才允许使用框架默认高度，并在映射记录中标记 `heightFallback=true`。
- 生成 XML/XAML 前，识别页面根节点最上方、仅用于画布说明/组件展示/工件示教的标题（例如 `工件边缘示教（2.2.1.E）`）。这类设计稿标题默认标记为 `design-artifact-title`，不生成到业务页面。
- 标题位于业务内容容器内部、且该容器/运行时页面明确需要它时才保留。不能因为“最上方”就删除真实业务标题；必须记录保留或剥离的节点 ID 与原因。
- 本项目页面顶部公共栏 126px 和根级设计稿标题 66px 均为固定公共外壳，标题始终按 `design-artifact-title` 剥离；因此根级保留控件的 `Top/Y` 统一按 MasterGo 原始坐标减 192px。该 192px 是当前项目固定约定，不需要为标题保留场景设置分支。嵌套控件仍按真实父子链使用相对坐标，不能重复减偏移。
- 当 MasterGo 根组件的 `rootContainer.overflow` 为 `hidden` 时，MTSLG XML 必须保留外层布局容器及其 `Width/Height` 裁剪边界，内部子控件使用相对父容器坐标。只有无裁剪需求时才允许展开为同级节点；若展开，必须显式保留等价裁剪边界。

## 交付和验证

默认交付完整页面，不是截图、占位控件或近似原型。生成后必须按目标模式验证：

- WPF：检查项目引用、Style/Resource 键、命名空间、绑定和原有代码风格，并执行可用的编译/加载验证；
- IOContorl：在 XML 结构检查前，使用 node scripts/validate-iocontrol-provenance.js --xml <page.xml> --mapping <mapping.json> 做 Value/来源/坐标硬校验；非零退出码即停止交付；
- IOContorl：检查 XML 结构、`ControlType`、属性白名单、父子坐标，执行 Ctrl+R 或等价加载验证；
- 两种模式都要做设计稿与运行结果的视觉核对。

## 按需参考

- 框架发现、路径绑定和索引：`mw-framework-index`；
- 项目首次适配：`references/project-adapter-initialization.md`；
- WPF 控件、Style 和协议：`references/adapters/mw-wpf/`；
- IOContorl 规则：`references/adapters/mtslg-iocontrol/`，其中本地 `feishu-component-library-mapping.md` 是唯一工作副本和完整组件集映射规范；运行时不依赖线上飞书文档；
- 组件库映射：`references/mastergo-component-mapping-rules.md` 及目标项目 `docs/`；
- 完整历史转换规则和未拆分的细节：`references/complete-conversion-rules.md`。

只有当前任务需要时才读取对应参考，不要默认加载全部参考资料。
