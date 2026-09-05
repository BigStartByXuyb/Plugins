---
name: mastergo-to-wpf
description: 将明确要求的 MasterGo 设计稿转换为 MW WPF/XAML、C# UserControl 或 MTSLG IOContorl XML，并按正式组件库实例和目标框架规范生成完整代码；仅在同时包含 MasterGo 设计来源与转换/生成意图时触发，不用于单独修改 XML、排查 Ctrl+R、普通 WPF 调试或单独讨论 MTSLG/IOContorl/API/代码索引。
---

# MasterGo 转 MW 代码

本 Skill 负责 MasterGo 设计稿到目标项目代码的完整转换。必须区分“按正式映射表生成结构”与“接入目标项目并完成运行时交付”：前者可以在没有目标项目时生成带待绑定标记的静态映射稿；后者才必须先使用 `mw-framework-index` 完成项目、框架、源码、索引、版本和页面宿主核对。

## 触发边界

必须同时满足：

1. 有 MasterGo 设计来源：链接、`fileId + layerId`、设计稿截图或结构化节点；
2. 用户明确要求转换/生成 WPF、XAML、C# UserControl 或 IOContorl XML。

仅出现以下内容时不要触发：单独修改已有 XML、单独排查 `Ctrl+R`、普通 WPF 调试、单独讨论 MTSLG/IOContorl API、单独维护组件库或代码索引。

## 开始前门禁

先判断交付目标：

- **结构映射稿**：用户明确要求输出独立的 WPF/XAML/IOContorl 文件，但未提供目标项目时，按正式映射表生成结构、节点、槽位、来源和坐标；运行时绑定与资源键写入待确认清单，不得用猜测值补齐。
- **项目运行时交付**：用户要求替换/部署/加载页面，或要求报告可运行、Ctrl+R、视觉一致时，才执行以下目标项目门禁：
  1. 读取并确认 `mw-framework-index` 输出的项目路径绑定和框架 Profile。
  2. 读取目标项目的 `framework.config.json`，按配置选择 `mw-wpf` 或 `mtslg-iocontrol`；选择、分流和互斥边界必须遵守“适配器选择门禁”。
  3. 确认框架源码、索引、组件库、真实页面样例和输出目录。
  4. 按页面宿主确认公共外壳边界。IOContorl 顶部栏/底部栏默认不生成 XML；WPF 是否生成公共栏取决于宿主是否负责。

无论哪种交付目标，组件只要命中正式映射，就必须按映射生成；只有完全没有匹配项时才暂停并询问新增、修改、近似替代或静态保留，未经确认不得用通用控件、无类型容器或视觉相似组件降级。

## 映射表优先级与适配层级

正式组件映射表是“组件结构”的最高优先级。匹配键优先为“独立组件集名称 + MasterGo 公开变体/属性名 + 真实属性值”；只有设计明确存在父子组合关系时才使用“父节点语义 + 公开属性名 + 真实属性值”。组件集 ID、实例 ID、图层名称和截图外观只用于追踪或辅助读取，不能替代匹配键。

按以下层级执行：

1. **正式映射表**决定 `ControlType`、`Style` 槽位/语义类别、节点数量、父子关系、槽位顺序和固定属性；不据此虚构具体资源键。
2. **目标项目源码/真实页面/键索引**决定 `IOName`、`IOCommand`、`LangName`、实际已登记的 `Style`/`Icon` 资源键和其他运行时字段；缺少对应键时标记待确认。
3. **MasterGo DSL**为映射槽位提供真实文本、实例属性、图标来源、尺寸和逐级坐标。
4. 图层名称、组件名称和视觉外观不得触发额外推断；没有映射的组件不得静默改成 `Button`、`Border`、无类型容器或其他近似控件。

结构映射稿与运行时交付的边界如下：目标项目缺失时仍必须完成已有映射覆盖的结构转换，但必须将未确认的绑定、资源键和运行时行为标记为待配置；不得把“静态 XML 可解析”描述为“页面已完成”。

## 适配器选择门禁（必须先完成）

在读取任一适配器专用参考、样例或脚本前，必须完成以下分流：

1. 有目标项目时，读取并校验其 `framework.config.json`；`mode` 必须明确为 `mw-wpf` 或 `mtslg-iocontrol`。
2. 没有目标项目时，用户必须明确指定独立交付的适配器；不得因为“WPF”、图层名称、目录名、截图或控件外观猜测。
3. 配置缺失、路径无效、模式不受支持或用户未指定适配器时，停止并询问；不得同时执行两条作业或生成混合产物。
4. 在任务记录和交付物中写明 `Adapter: mw-wpf` 或 `Adapter: mtslg-iocontrol`。选定后只执行对应作业；另一作业的协议、资源、页面格式、样例和校验器不得混入。

## 作业 A：原生 MW WPF（`Adapter: mw-wpf`）

1. 核对真实 MW 控件源码、现有 WPF 页面、Style/Resource 键、Geometry 资源和页面宿主。
2. 先读 `references/adapters/mw-wpf/mw-wpf-framework.md`；再按命中的控件、资源或协议按需读 `references/adapters/mw-wpf/framework-manual/` 下对应的 controls、resources、protocols 或 scenarios 文档。不得预读 MTSLG 映射或 XML 文档。
3. 生成目标项目约定的 XAML、C# UserControl/ViewModel 与资源；直接使用项目真实的 MW 控件和协议，例如 `s:IconButton`、`MainButtonStyle`、`PageName`、`s:Action`、`IOEnable`。
4. 验证命名空间、资源键、绑定、编译和 WPF 页面加载。禁止以普通 WPF 控件替代已有 MW 能力；仅在本作业需要 Geometry 时按需使用 `scripts/gen-icons-xaml.js` 与 `scripts/scan-icon-coords.js`。

本作业不得生成 MTSLG `IOContorl` XML、MTSLG `Layout.xml` 注册或调用 MTSLG provenance 校验器。

## 作业 B：MTSLG IOContorl（`Adapter: mtslg-iocontrol`）

1. 先读 `references/adapters/mtslg-iocontrol/mtslg-mode.md`；再读取 `feishu-component-library-mapping.md` 和 `mtslg-iocontrol-map.json`，核对正式组件映射、XML 属性白名单、现有 IOContorl 页面、Layout 与页面宿主。不得读取 MW WPF 控件协议作为 XML 事实源。
2. 生成真实 `IOContorl` XML、逐节点 mapping/provenance 和必要的 Layout 注册；`ControlType`、固定组件层级和槽位首先使用正式映射表，目标项目只用于确认 Style/Icon/LangName、IOName/IOCommand 和运行时键。使用 `scripts/gen-iocontrol-xml.js` 发射 XML；有 PATH/SVG 时使用 `scripts/gen-icons-xaml.js`，并保留图标来源。
3. 在 XML 结构检查前运行 `scripts/validate-iocontrol-provenance.js`；需要独立坐标检查时以节点数组调用 `scripts/check-iocontrol-coords.js`，有 Geometry 时调用 `scripts/scan-icon-coords.js`，再执行宿主加载与视觉核对。顶部/底部公共栏必须记录为“框架负责、页面不生成”。

本作业不得写入 WPF 私有协议，例如 `s:Action`、WPF `PageName` 或 WPF ResourceDictionary/绑定语法；没有正式映射时不得降级为普通 Button、无类型容器或静态占位结构。

## 页面输出目录

- 旧模式 MW WPF/XAML 生成的中间页面默认写入目标项目根目录下的 `Pages/`，与 `Resources/` 同级；页面文件使用 `Pages/*.xaml`，资源字典仍使用 `Resources/`。
- MTSLG IOContorl 页面不套用 WPF 中间页面目录规则，继续按目标项目 `framework.config.json` 的 `pages_root` 输出；当前运行时参考路径为 `Config/Common/Pages`（Windows 路径为 `Config\\Common\\Pages`）。

## 组件和映射原则

- 使用一份组件语义映射，并按组件登记 `targets.mw-wpf` 与 `targets.mtslg-iocontrol`；正式映射存在时严格按映射表，不得凭外观、Group 名称或截图猜控件。
- WPF 控件、Style、资源和协议以源码/真实页面为事实源；IOContorl 的组件结构和 `ControlType` 以正式映射表为事实源，目标项目运行时资料用于核对属性、资源键和绑定。
- 组件实例优先于原始图层；未登记的业务组合必须标记待确认。
- 未确认的运行时字段只能写入 mapping manifest 或 XML 注释，禁止把“待人工绑定”作为可见 `Value`、伪造 `IOName` 或伪造 `IOCommand`。
- 设计稿中顶部栏、底部栏和其他公共外壳按宿主边界剥离；保留节点统一换算到内容区坐标，并记录被剥离节点。

### 组件内部内容与来源

- 所有适配器都必须读取组件实例的完整 DSL 父子链；组件内部的 TEXT、PATH/SVG、FRAME 只能按已选适配器的正式映射解释，不能因视觉外观提升为独立业务控件。
- 输入框、选择框的 MTSLG 控件类型、40/36/32 变体、内部 padding、TEXT/PATH 归属和 XML 输出模板只在作业 B 读取 `references/adapters/mtslg-iocontrol/feishu-component-library-mapping.md`；总 Skill 不重复维护这些映射事实。


### 文本来源与 Value 绑定硬门禁

- 每个生成的 XML/XAML 文本控件必须绑定到唯一的 MasterGo `layerId`/DSL `ref`，并记录其真实 `sourceParent`、原始文本、文本槽位和最终输出属性；组件实例的 `ID`、语义名称、坐标方向或业务推测不能作为文本来源。
- `Value` 只能使用对应 DSL 文本节点的真实文本或已确认的运行时绑定字段。禁止因为 XML `ID` 含有 `X`、`Y`、`Label`、`Value` 等词，或因为控件位于某个视觉位置，就推断、替换或重命名文本；例如 `RelativePositionXLabel` 不得自动生成 `Value="X"`。
- 同一模板的每个实例必须分别读取文本覆盖和父子层级；相同 `componentId`、相同结构、相邻排列或截图文字不能互相借用。设计稿中的 `3:56338 → 镜头倍率` 与兄弟节点 `3:56367 → Y` 必须保持独立。
- 生成前执行“XML 节点 → 唯一 layerId/ref → 父节点链 → 原始文本 → Value/绑定字段”反向核对；任一项缺失、重复或冲突时，停止生成并标记待确认，不得用语义名称或坐标补齐。

### 坐标转换硬门禁（实例与全部子组件）

- 每个 MasterGo 实例、子实例、Frame、Group 和文本/控件节点都必须绑定唯一的来源 `layerId`（或 DSL `ref`），并单独记录 `sourceParent`、`pageAbsX/pageAbsY`、`relativeX/relativeY`、`Width/Height` 和最终发射的 `Left/Top`；没有来源绑定的节点不得进入最终 XML。
- 页面根级和嵌套节点都必须先解析为各自的 MasterGo 页面绝对 bbox。`pageAbsX/pageAbsY` 是不可变的来源事实；`relativeX/relativeY` 仅用于验证真实父子链，不能在未确认最终输出父子关系前直接复制为 XML/WPF 坐标。
- 即使多个实例拥有相同 `componentId`、相同结构、相同文本或相同变体，也必须分别读取并计算各自实例及其全部子节点坐标；固定模板只决定结构和语义槽位，不决定实例位置。
- 禁止根据文字语义、截图观感、相邻排列、组件模板、其他实例或“应该在这里”的布局习惯推断任何 `Left/Top`。设计稿数据与视觉观感冲突时，暂停并报告冲突。
- 生成前必须逐项核对“XML 节点 ↔ 唯一 MasterGo layerId/ref ↔ 父节点链 ↔ 页面绝对坐标”；语义名称或 `ControlType + 坐标` 只能用于诊断，不能作为最终绑定。

### 绝对坐标输出规则

- 每个最终输出的 IOContorl/WPF 控件都必须由自身 MasterGo bbox 定位；`Left/Top` 不能由父容器尺寸、相邻控件、字体或视觉间距推算。
- 根级节点，或正式映射确认可展平的节点，按内容区绝对坐标发射：`Left = pageAbsX - contentOriginX`、`Top = pageAbsY - contentOriginY`，公共外壳偏移只扣一次。
- MTSLG 中正式映射要求保留父容器的子节点，按该已保留父容器发射相对坐标；根级扣除内容区偏移后，子节点不重复扣除。具体公式、裁剪边界与 XML 示例只读取 `references/adapters/mtslg-iocontrol/mtslg-mode.md`。
- WPF 的最终坐标/布局属性必须由目标页面的真实布局容器决定；不得把 MTSLG 的 XML 坐标规则照搬到 WPF。
- 输出前必须保留“输出节点 ↔ 唯一 layerId/ref ↔ 自身 pageAbs bbox ↔ 输出父节点 ↔ 最终 Left/Top”清单；任一控件缺少自身 bbox 或输出父节点依据时不得交付。

### 来源清单与不可交付门禁

- 生成 IOContorl XML 前必须建立逐节点 mapping manifest；manifest 必须同时包含从原始 DSL 机械提取的 sourceNodes。每条 sourceNodes 记录至少包含 ref、parentRef、pageAbsX/pageAbsY、relativeX/relativeY、width/height 和真实 text（文本节点）；每条输出节点记录至少包含 xmlId、唯一 sourceRef、sourceParent、sourceText（文本节点）、输出父节点依据、expectedLeft/expectedTop/expectedWidth/expectedHeight。当前校验器仅支持输出父节点与真实 `sourceParent` 一致；映射若需改变输出父节点，必须先扩展校验器，不得静默发射。
- 文本节点的 Value 必须机械复制 sourceText；valueSource 必须为 dsl.text。禁止用 XML ID、组件属性名、字段名、坐标方向、视觉位置、模板槽位或业务语义生成 Value。RelativePositionXLabel 不得生成 Value="X"。
- 坐标必须机械计算：MTSLG 根级/展平节点以 `pageAbs - contentOrigin` 发射；保留父容器的子节点以 `pageAbs - parent.pageAbs` 发射，并且内容区偏移只在根级扣一次；`Width/Height` 必须来自同一 sourceRef 的 bbox。禁止用 ID、相邻节点、截图观感、固定模板或“应该在这里”补坐标。
- 坐标空间必须明确：`sourceNodes` 永远保存 MasterGo 原始页面绝对坐标；输出节点的 `expectedLeft/expectedTop` 记录实际发射坐标，而不是替代来源事实。校验器必须用 `sourceNodes`、真实父子链和根级内容区偏移独立重算。
- 生成器必须在写文件前执行 scripts/validate-iocontrol-provenance.js；校验器不得把 nodes 中的 expected 值当作 DSL 事实，必须用 sourceNodes 独立重算。任何 sourceNodes 缺失、UNTRACKED、Value != sourceText、缺少来源字段、父节点缺失或几何不匹配都必须以非零状态失败。验证失败时禁止输出、覆盖或交付 XML。
- 禁止仅凭 XML 可解析、控件数量正确或肉眼看起来接近就宣称完成；必须保留 manifest 和校验输出作为交付证据。无法建立来源链时，停止并标记待确认。

## 交付和验证

默认交付完整页面，不是截图、占位控件或近似原型。生成后必须按目标模式验证：

- WPF：检查项目引用、Style/Resource 键、命名空间、绑定和原有代码风格，并执行可用的编译/加载验证；
- IOContorl：在 XML 结构检查前，使用 node scripts/validate-iocontrol-provenance.js --xml <page.xml> --mapping <mapping.json> 做 Value/来源/坐标硬校验；非零退出码即停止交付；
- IOContorl：检查 XML 结构、`ControlType`、属性白名单、父子坐标，执行 Ctrl+R 或等价加载验证；
- 两种模式都要做设计稿与运行结果的视觉核对。

## 公共参考（仅在对应条件满足时读取）

- 框架发现、路径绑定和索引：`mw-framework-index`；仅项目运行时交付使用。
- 项目首次适配：`references/project-adapter-initialization.md`；仅在有效 `framework.config.json`、组件目录或资源目录尚未确认时使用。它不选择适配器。
- 跨适配器组件语义：`references/mastergo-component-mapping-rules.md`；仅用于两条作业共用的设计来源、组件身份与来源链规则。
- 完整历史转换规则：`references/complete-conversion-rules.md`；仅在本 Skill 未覆盖的历史兼容细节确有必要时使用。

不得默认加载全部 references；适配器专用参考和脚本只按各自作业链读取与执行。
