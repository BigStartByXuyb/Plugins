<title>MasterGo 组件库 → MTSLG IOContorl 映射标准</title>

匹配键统一使用“父节点语义 + MasterGo 变量属性名 + 变量值”。例如：父节点=右侧栏 + 变量属性名=按钮类型 + 变量值=上下布局。组件集 ID、实例 ID 和设计师自定义名称只作为内部读取追踪信息，不参与唯一匹配，也不默认写成飞书正文中的“来源”行；只有全文已有同类字段或用户明确要求时才写入。变量值负责切换固定实例模板，ControlType、节点数量、父子关系和槽位顺序由模板固定，花括号字段由对应 MasterGo 节点或业务配置填充。

# 组件层级身份规则

先识别父节点语义，再读取该节点公开属性名和属性值。

组件匹配优先识别独立组件集，再读取实例变体和公开属性；`输入框`、`选择框` 等独立组件不再默认归入“左标题+右信息”。

匹配键示例：组件集=输入框 + 变体=输入框-整数-40；高度只映射到 `Height`，不改变 `ControlType`。

# MasterGo 组件集：输入框 → MTSLG 映射关系（当前规则）

## 完整组件父子结构（以当前组件库 DSL 为准）

- 输入框的结构是：`COMPONENT_SET 输入框` → `COMPONENT 变体` → `INSTANCE 变体` → `FRAME 外框/容器` → `FRAME 内层输入区域` → `TEXT 固定文本框`。输出时输入框本体是一个 IOContorl；内层 Frame 只作为真实结构、边框和裁剪依据，不能凭外观增加虚构容器。
- 整数/小数变体中，外框高度为 40/36/32，内部文本 bbox 高度固定为 18；其纵向位置随 DSL padding 变化。`FontSize` 与外框 `Height` 必须分别读取。
- 文字输入框的结构是 `COMPONENT_SET` → `COMPONENT` → `INSTANCE` → `FRAME 输入框` → `TEXT`，内部固定文本属于 TextBox 组件内容，不生成额外 TextBlock。

## 完整组件父子结构：选择框

- 选择框的结构是：`COMPONENT_SET 选择框` → `COMPONENT 变体` → `INSTANCE 变体` → `INSTANCE 选择框` → `TEXT 固定文本框 + PATH 下拉箭头`。
- `TEXT` 与 `PATH` 都是选择框内部子节点；MTSLG 映射生成一个 `ComboBox`，不得把箭头 PATH 拆成独立 IOContorl。PATH 仍需保留唯一 `sourceRef` 和 `svgKey` 作为来源证据。
- 40/36/32 只决定外层选择框的 `Height`；DSL 中 40/36/32 的内部 padding 和文本/箭头相对位置也要分别读取。当前证据为文本相对 Y=11/9/7、箭头相对 Y=15/13/11，不能用字体字号推导高度或位置。

`输入框` 是独立组件集，不再作为“左标题+右信息”的嵌套变体处理。标题、单位、说明文字等文本节点固定映射为 `TextBlock`；输入框本体单独生成。

| MasterGo 变体 | MTSLG ControlType | 尺寸规则 |
|---|---|---|
| 输入框-整数-40 / 36 / 32 | `IntNumberBox` | 只将 40/36/32 写入 `Height` |
| 输入框-小数-40 / 36 / 32 | `NumberBox` | 只将 40/36/32 写入 `Height` |
| 输入框-文字-40 / 36 / 32 | `TextBox` | 只将 40/36/32 写入 `Height` |

示例：

```
<IOContorl ID="{id_input}" IOName="{io_name}" ControlType="IntNumberBox" DefaultValue="{default_value}" Value="{value}" Left="{left}" Top="{top}" Width="{width}" Height="{height}" />
```

高度后缀不产生新的代码控件类型；当前项目默认使用 `Height="40"`。`Left`、`Top`、`Width`、`Height` 必须直接取该控件自身 MasterGo bbox，不能从旧外层容器、相邻组件、字体或视觉间距推算。

## 绝对坐标硬门禁

- 每个 IOContorl 节点必须绑定唯一 `layerId/ref` 和自身 `pageAbsX/pageAbsY/Width/Height`。
- 最终坐标统一为内容区绝对坐标：`Left = pageAbsX - contentOriginX`，`Top = pageAbsY - contentOriginY`。
- 公共顶部栏和设计稿示例标题等偏移只在根级归一化时扣除一次；不得重复扣除，也不得把父容器的相对坐标直接当成最终坐标。
- 嵌套关系只用于表达真实结构和 `overflow` 裁剪边界；最终 `Left/Top` 仍以每个控件自身 bbox 为准。
- 缺少自身 bbox 或来源链时，停止生成并标记待确认。

## 文本槽位与 Value 来源硬门禁

固定模板只定义标题、数值、单位等槽位的结构，不定义槽位里的具体文案。每个槽位必须绑定该实例真实的 MasterGo `layerId`/DSL `ref`、父节点链和文本节点；`Value` 只能取该文本节点的原始内容或已确认的运行时绑定字段。禁止根据 XML `ID`、槽位名称、X/Y 方向、坐标位置、截图观感或其他实例推断文本。

例如 `3:56338` 的标题槽位真实文本是“镜头倍率”，即使生成节点命名为 `RelativePositionXLabel`，也不得写成“X”；页面中另一个 `3:56367` 实例的标题文本“Y”必须独立绑定。生成后必须反向检查：每个 XML 文本节点只能对应一个来源 `layerId`/`ref`，且原始文本与 `Value` 一致；发现冲突时停止生成，不得静默改写。

# 坐标与容器边界规则

## 页面根级坐标归一

本项目页面顶部公共栏 126px 和根级设计稿标题 66px 均为固定公共外壳，标题始终按 `design-artifact-title` 剥离；因此根级保留控件的 `Top/Y` 统一按 MasterGo 原始坐标减 192px。该 192px 是当前项目固定约定，不需要在映射 JSON 中配置。偏移只作用于根级坐标，不改变控件的 `Width/Height`；嵌套控件不重复扣除页面偏移。

## 组件父子关系与绝对坐标

固定映射：父子关系只用于确认真实结构、槽位和裁剪边界；每个输出节点的 `Left/Top` 都使用自身的 MasterGo 页面绝对 bbox 计算。左标题、右侧文案/控件和单位分别按照真实来源映射；不同 section、不同组件实例必须分别读取和计算，禁止套用其他实例的外层坐标。

**实例坐标不可推断：** 即使实例拥有相同 `componentId`、相同模板结构、相同文本或相同变体，也必须以该实例唯一的 MasterGo `layerId`/DSL `ref` 重新读取页面绝对 `x/y`，并对它的每一个子实例和子节点沿真实父子链逐级计算。固定模板只定义 `ControlType`、节点结构和语义槽位，不定义任何实例的页面位置。缺少来源 ID、父节点链或真实坐标时，标记为“待确认”，不得用截图、语义名称、相邻组件或其他实例坐标补齐。

## `overflow=hidden` 与裁剪边界

当 MasterGo 根组件的 `rootContainer.overflow` 为 `hidden` 时，生成 XML 必须保留对应的外层布局容器及其 `Width/Height` 边界，内部子控件仍按自身绝对 bbox 计算位置。组件模板仍按 L/R/U 等语义槽位映射，但 L/R/U 必须位于该外层容器内。只有根组件没有裁剪需求时，才允许将语义槽位展开为同级节点；若展开，必须显式保留等价裁剪边界。该裁剪规则优先于“平级节点”的模板书写形式。

# MasterGo 组件集：左标题+右信息 → MTSLG 映射关系（旧版，已废弃）

本章仅保留历史兼容参考，不得用于新的独立 `输入框`、`选择框` 组件匹配；新转码必须优先使用上面的独立组件集规则。

## 匹配规则

- 父组件集名称=左标题+右信息。
- 读取“文本结构”，选择下列六个固定模板。
- L=左标题，R=右侧值/控件，U=单位。
- 下方“平级节点”仅表示无裁剪需求时的语义展开形式；若根组件 `rootContainer.overflow=hidden`，一律优先遵守本章的外层容器和裁剪边界规则。

## 实例变体：文本结构=标题+文字

固定结构：无裁剪需求时为 L TextBlock + R TextBlock，两个平级节点；若根组件 `rootContainer.overflow=hidden`，则两个语义槽位必须保留在外层布局容器内，子节点坐标相对该容器。

```
<IOContorl ID="{id_label}" IOName="{io_name_label}" ControlType="TextBlock" IOState="{state_label}" IOEnable="{enable_label}" LangName="{lang_label}" Value="{label_value}" MinValue="" MaxValue="" Left="{label_left}" Top="{label_top}" Width="{label_width}" Height="{label_height}" FontSize="{label_font_size}" />
<IOContorl ID="{id_value}" IOName="{io_name_value}" ControlType="TextBlock" IOState="{state_value}" IOEnable="{enable_value}" LangName="{lang_value}" Value="{value_value}" MinValue="" MaxValue="" Left="{value_left}" Top="{value_top}" Width="{value_width}" Height="{value_height}" FontSize="{value_font_size}" />
```

左侧 TEXT→label\_\*；右侧 TEXT→value\_\*。

## 实例变体：文本结构=标题+选择框

固定结构：L TextBlock + R ComboBox。

```
<IOContorl ID="{id_label}" IOName="{io_name_label}" ControlType="TextBlock" IOState="{state_label}" IOEnable="{enable_label}" LangName="{lang_label}" Value="{label_value}" Left="{label_left}" Top="{label_top}" Width="{label_width}" Height="{label_height}" FontSize="{label_font_size}" />
<IOContorl ID="{id_combo}" IOName="{io_name}" ControlType="ComboBox" Style="{combo_style}" IOState="{state}" IOEnable="{enable}" Value="{selected_value}" IOCommand="{io_command}" Left="{combo_left}" Top="{combo_top}" Width="{combo_width}" Height="{combo_height}" FontSize="{combo_font_size}">{combo_items}</IOContorl>
```

标题 TEXT→label\_\*；选择框实例→selected_value/combo\_\*；选项→combo_items；业务字段→IOName/IOCommand。

## 实例变体：文本结构=标题+输入框-整数

固定结构：L TextBlock + R IntNumberBox。

```
<IOContorl ID="{id_label}" IOName="{io_name_label}" ControlType="TextBlock" IOState="{state_label}" IOEnable="{enable_label}" LangName="{lang_label}" Value="{label_value}" Left="{label_left}" Top="{label_top}" Width="{label_width}" Height="{label_height}" FontSize="{label_font_size}" />
<IOContorl ID="{id_input}" IOName="{io_name}" ControlType="IntNumberBox" IOState="{state}" IOEnable="{enable}" Value="{value}" MinValue="{min_value}" MaxValue="{max_value}" IOCommand="{io_command}" Left="{input_left}" Top="{input_top}" Width="{input_width}" Height="{input_height}" FontSize="{input_font_size}" />
```

标题 TEXT→label\_\*；整数输入实例→value/min_value/max_value/input\_\*。

## 实例变体：文本结构=标题+输入框-文案

固定结构：L TextBlock + R TextBox。代码库现有页面已登记 `ControlType="TextBox"`，因此这里不是可变 ControlType。

```
<IOContorl ID="{id_label}" IOName="{io_name_label}" ControlType="TextBlock" IOState="{state_label}" IOEnable="{enable_label}" LangName="{lang_label}" Value="{label_value}" Left="{label_left}" Top="{label_top}" Width="{label_width}" Height="{label_height}" FontSize="{label_font_size}" />
<IOContorl ID="{id_input}" IOName="{io_name}" ControlType="TextBox" IOState="{state}" IOEnable="{enable}" LangName="{lang_name}" Value="{value}" IOCommand="{io_command}" Left="{input_left}" Top="{input_top}" Width="{input_width}" Height="{input_height}" FontSize="{input_font_size}" />
```

标题 TEXT→label\_\*；文案输入实例→value/input\_\*；业务字段→IOName/IOCommand。占位提示若框架支持，再按项目登记的 TextBox 属性填充，不改变 ControlType。

## 实例变体：文本结构=标题+输入框-小数

固定结构：无裁剪需求时为 L TextBlock + R NumberBox + U TextBlock，R/U 间距来自右侧 Frame；若根组件 `rootContainer.overflow=hidden`，则三个语义槽位必须保留在外层布局容器内，子节点坐标相对该容器。

```
<IOContorl ID="{id_label}" IOName="{io_name_label}" ControlType="TextBlock" IOState="{state_label}" IOEnable="{enable_label}" LangName="{lang_label}" Value="{label_value}" Left="{label_left}" Top="{label_top}" Width="{label_width}" Height="{label_height}" FontSize="{label_font_size}" />
<IOContorl ID="{id_input}" IOName="{io_name}" ControlType="NumberBox" IOState="{state}" IOEnable="{enable}" Value="{value}" MinValue="{min_value}" MaxValue="{max_value}" IOCommand="{io_command}" Left="{input_left}" Top="{input_top}" Width="{input_width}" Height="{input_height}" FontSize="{input_font_size}" />
<IOContorl ID="{id_unit}" IOName="{io_name_unit}" ControlType="TextBlock" IOState="{state_unit}" IOEnable="{enable_unit}" LangName="{lang_unit}" Value="{unit_value}" Left="{unit_left}" Top="{unit_top}" Width="{unit_width}" Height="{unit_height}" FontSize="{unit_font_size}" />
```

三个节点分别填 label\_\*/input\_\*/unit\_\*；精度→NumberBox 登记参数。

## 实例变体：文本结构=标题+文字+单位

固定结构：无裁剪需求时为 L TextBlock + R TextBlock + U TextBlock，R/U 间距来自右侧 Frame；若根组件 `rootContainer.overflow=hidden`，则三个语义槽位必须保留在外层布局容器内，子节点坐标相对该容器。

```
<IOContorl ID="{id_label}" IOName="{io_name_label}" ControlType="TextBlock" IOState="{state_label}" IOEnable="{enable_label}" LangName="{lang_label}" Value="{label_value}" Left="{label_left}" Top="{label_top}" Width="{label_width}" Height="{label_height}" FontSize="{label_font_size}" />
<IOContorl ID="{id_value}" IOName="{io_name_value}" ControlType="TextBlock" IOState="{state_value}" IOEnable="{enable_value}" LangName="{lang_value}" Value="{value_value}" Left="{value_left}" Top="{value_top}" Width="{value_width}" Height="{value_height}" FontSize="{value_font_size}" />
<IOContorl ID="{id_unit}" IOName="{io_name_unit}" ControlType="TextBlock" IOState="{state_unit}" IOEnable="{enable_unit}" LangName="{lang_unit}" Value="{unit_value}" Left="{unit_left}" Top="{unit_top}" Width="{unit_width}" Height="{unit_height}" FontSize="{unit_font_size}" />
```

左 TEXT→L；右侧 Frame 内 value TEXT→R、unit TEXT→U。

# MasterGo 组件集：选择+信息 → MTSLG 映射关系

固定结构：选择控件 + TextBlock，两个平级节点。属性1 决定选择控件类型和选中状态：单选-选中/未选择→RadioButton，多选-选中/未选中→CheckBox。

```
<!-- 属性1=单选-选中/未选择：默认圆点 RadioButton，使用隐式 RadioButtonBaseStyle -->
<IOContorl ID="{id_choice}" ControlType="RadioButton" Value="{checked}" IOName="{io_name}" IOCommand="{io_command}" IOEnable="{io_enable}" IOState="{io_state}" Left="{choice_left}" Top="{choice_top}" Width="{choice_width}" Height="{choice_height}" />
<IOContorl ID="{id_text}" ControlType="TextBlock" Value="{info_value}" IOState="{text_state}" IOEnable="{text_enable}" Left="{text_left}" Top="{text_top}" Width="{text_width}" Height="{text_height}" FontSize="{text_font_size}" />

<!-- 属性1=多选-选中/未选中：默认 CheckBox 样式 -->
<IOContorl ID="{id_choice}" ControlType="CheckBox" Value="{checked}" IOName="{io_name}" IOCommand="{io_command}" IOEnable="{io_enable}" IOState="{io_state}" Left="{choice_left}" Top="{choice_top}" Width="{choice_width}" Height="{choice_height}" />
<IOContorl ID="{id_text}" ControlType="TextBlock" Value="{info_value}" IOState="{text_state}" IOEnable="{text_enable}" Left="{text_left}" Top="{text_top}" Width="{text_width}" Height="{text_height}" FontSize="{text_font_size}" />
```

# MasterGo 组件集：单选+多选 → MTSLG 映射关系

固定结构：一个选择控件 IOContorl，无 TextBlock 子节点。属性1 决定 ControlType 和状态：单选-选中/未选择→RadioButton，多选-选中/未选择→CheckBox。

```
<!-- 属性1=单选-选中/未选择：使用默认 RadioButtonBaseStyle，除非 MasterGo 明确提供已登记 Style -->
<IOContorl ID="{id}" ControlType="RadioButton" IOState="{io_state}" Value="{value}" IOParam="{io_param}" IOName="{io_name}" IOCommand="{io_command}" IOEnable="{io_enable}" Left="{left}" Top="{top}" Width="{width}" Height="{height}" />

<!-- 属性1=多选-选中/未选择：使用默认 CheckBox 样式，除非 MasterGo 明确提供已登记 Style -->
<IOContorl ID="{id}" ControlType="CheckBox" IOState="{io_state}" Value="{value}" IOParam="{io_param}" IOName="{io_name}" IOCommand="{io_command}" IOEnable="{io_enable}" Left="{left}" Top="{top}" Width="{width}" Height="{height}" />
```

属性1=选中/未选中→状态字段；由控件默认状态样式决定圆点/勾选颜色和显示状态。固定模板默认不写 Style：独立 RadioButton 使用隐式 RadioButtonBaseStyle，CheckBox 使用默认 CheckBox 样式；只有 MasterGo 明确提供并且代码库已登记对应样式时，才增加 Style 属性。

节点文案/业务值→Value；业务字段/动作→IOName/IOCommand。

- 在现有 XML 中，RadioButton 的 Value 常是业务选项值，IOParam 是提交值；它们不等同于设计稿的选中状态。
- 同组互斥关系由页面配置/业务字段确定。

# MasterGo 组件集：信息分组-模块化 → MTSLG 映射关系

MasterGo 组件集“信息分组-模块化”映射为一个固定 GroupBox 外壳。该组件对外只有两个业务参数：标题名称→Header；多语言资源→LangName（由 Header 查资源库）。内部子节点不是 GroupBox 的可变类型参数，按子组件模板展开。

```
<IOContorl ID="{id_group}" IOName="" ControlType="GroupBox" IOEnable="{io_enable}" Header="{header}" LangName="{lang_name}" MinValue="" MaxValue="" Left="{left}" Top="{top}" Width="{width}" Height="{height}">{child_io_controls}</IOContorl>
```

- MasterGo 根组件名称/实例名称→组件身份，不写入 Header。
- 根组件内标题 TEXT（例如“周期名称”）→Header；再由 Header 查询对应 LangName。
- GroupBox 的位置、宽高来自根组件；组内子控件按各自模板生成，使用相对坐标。

```
<IOContorl ID="{id_tab}" ControlType="{tab_type}" Style="{tab_style}" Value="{tab_value}" Left="{left}" Top="{top}" Width="{width}" Height="{height}" />
```

```
<IOContorl ID="{id_tab_root}" ControlType="{tab_control_type}" Left="{left}" Top="{top}" Width="{width}" Height="{height}">{tab_children}</IOContorl>
```

# MasterGo 控件类型：IconButton → MTSLG 映射规则（按父节点分流）

## 父节点=右侧栏：IconButton 按钮族映射关系

父节点语义必须完整读取，区分“右侧栏-左右结构”和“右侧栏-上下结构”；不能只写“左右结构/上下结构”。

父节点=右侧栏-上下结构，变量属性名=按钮类型，变量值=startstop（对应上下结构实例）→ Style 固定为 UpDownRightButtonStyle。

父节点=右侧栏-左右结构，命中普通左右结构实例 → Style 固定为 RightButtonStyle；该结论只适用于右侧栏，不适用于中间区域。

### 父节点=右侧栏-左右结构：IconButton 实例

固定结构：一个 IconButton IOContorl，Style 固定为 RightButtonStyle；与右侧栏上下结构实例同属右侧栏按钮族。

```
<IOContorl ID="{id}" IOName="{io_name}" IOCommand="{io_command}" ControlType="IconButton" Style="RightButtonStyle" Icon="{icon}" IconHeight="{icon_height}" IconWidth="{icon_width}" TopLeftContent="{top_left_content}" IOEnable="{io_enable}" IOState="{io_state}" LangName="{lang_name}" Value="{value}" Left="{left}" Top="{top}" Width="{width}" Height="{height}" />
```

文案→Value；业务字段/动作→IOName/IOCommand；图标→Icon/IconHeight/IconWidth；F1/F2/F10→TopLeftContent；MasterGo 未提供的可选属性整行删除。

### 父节点=右侧栏-上下结构：IconButton 实例

固定结构：一个 IconButton IOContorl，Style 固定为 UpDownRightButtonStyle；与右侧栏左右结构实例同属右侧栏按钮族。

```
<IOContorl ID="{id}" IOName="{io_name}" IOCommand="{io_command}" ControlType="IconButton" Style="UpDownRightButtonStyle" Icon="{icon}" IconHeight="{icon_height}" IconWidth="{icon_width}" TopLeftContent="{top_left_content}" IOEnable="{io_enable}" IOState="{io_state}" LangName="{lang_name}" Value="{value}" Left="{left}" Top="{top}" Width="{width}" Height="{height}" />
```

文案→Value；业务字段/动作→IOName/IOCommand；图标→Icon/IconHeight/IconWidth；F1/F2/F10→TopLeftContent；MasterGo 未提供的可选属性整行删除。

匹配时必须保留完整父节点语义；同名的左右/上下结构若位于中间区域，必须进入中间区域自己的映射规则，不能复用右侧栏 Style。

固定模板：父节点=右侧栏-上下结构，按钮类型=startstop

固定节点：一个 IconButton IOContorl；ControlType 固定为 IconButton，Style 固定为 UpDownRightButtonStyle。匹配键包含父节点=右侧栏-上下结构和按钮类型=startstop。

固定模板：父节点=右侧栏-左右结构，按钮类型=对应真实值

固定节点：一个 IconButton IOContorl；ControlType 固定为 IconButton，Style 固定为 RightButtonStyle。匹配键包含父节点=右侧栏-左右结构和 MasterGo 实际按钮类型变量值。

左右/上下结构名称只是实例语义；Style 由完整父节点语义和变量属性值共同决定，中间区域不得套用右侧栏规则。

## 父节点=主菜单：IconButton → MTSLG 映射关系

### 匹配规则

- 父节点语义=主菜单/主菜单区域。
- 主菜单按钮的代码类型固定为 `ControlType="IconButton"`，Style 固定为 `MainButtonStyle`。
- 如果 MasterGo 公开变量属性负责切换主菜单按钮实例，使用“父节点=主菜单 + 变量属性名 + 真实变量值”命中本模板；组件集 ID 和实例 ID 只作追踪。

### 固定模板

主菜单button（MasterGo 节点名称）对应一个 IconButton IOContorl；按钮文案、图标、F 标签和位置尺寸由对应节点填充。

```
<IOContorl ID="{id}" IOName="{io_name}" IOCommand="{io_command}" ControlType="IconButton" Style="MainButtonStyle" Icon="{icon}" IconHeight="{icon_height}" IconWidth="{icon_width}" TopLeftContent="{top_left_content}" IOEnable="{io_enable}" IOState="{io_state}" LangName="{lang_name}" Value="{value}" Left="{left}" Top="{top}" Width="{width}" Height="{height}" />
```

- 按钮文案→Value；业务字段/动作→IOName/IOCommand；图标→Icon/IconHeight/IconWidth；F1/F2/F10→TopLeftContent；多语言→LangName。
- MasterGo 未提供的 Icon、TopLeftContent、状态或其他可选字段，连同对应 XML 属性删除；不新增代码库未登记的属性。

# MasterGo 组件集：Table → MTSLG 映射关系

固定结构：一个 DataGrid IOContorl，可包含列定义子节点。父节点、子节点关系和列顺序按 MasterGo 结构读取。

```
<IOContorl ID="{id_table}" ControlType="DataGrid" IOName="{io_name}" IOCommand="{io_command}" Value="{data_source}" IOEnable="{io_enable}" IsAutoRefresh="{is_auto_refresh}" Style="{style_data_grid}" Left="{left}" Top="{top}" Width="{width}" Height="{height}">
<IOContorl ID="" ControlType="TextBlock" IOVisible="false" Value="{hidden_id_field}" Left="0" Top="0" />
<IOContorl ID="" IOName="{column_1_name}" ControlType="{column_1_control_type}" Value="{column_1_field}" MinValue="{column_1_min}" MaxValue="{column_1_max}" Left="{column_1_left}" Top="{column_1_top}" Width="{column_1_width}" Height="{column_1_height}" />
<IOContorl ID="" IOName="{column_2_name}" ControlType="{column_2_control_type}" Value="{column_2_field}" Left="{column_2_left}" Top="{column_2_top}" Width="{column_2_width}" Height="{column_2_height}" />
<!-- 按 MasterGo 表格列继续展开固定子节点 -->
</IOContorl>
```

DataGrid 根节点：数据源→Value；业务字段/表标识→IOName；加载、刷新或选中动作→IOCommand；可用条件→IOEnable；自动刷新→IsAutoRefresh；位置和尺寸→Left/Top/Width/Height。Style 只填 MasterGo 节点实际提供且代码库已登记的样式。DataGrid 子节点按 MasterGo 列结构展开：列字段/标题→子节点 Value，列业务字段→子节点 IOName，列控件类型固定为实际登记的 TextBlock、NumberBox、IntNumberBox 等；隐藏主键列使用 IOVisible="false"。若父节点明确是 TabControl，则外层按 TabControl/TabItem 模板生成，Table 子节点仍只对应 DataGrid。

**Value 必填边界（实测）**：

- 必填的是 DataGrid **根节点**的 `Value="{data_source}"`。该属性完全缺失会在 `IODataGrid.LoadDataSource` 中触发空引用；最终配置还必须填写非空、可解析的数据文件名。
- 列子节点的 `Value="{column_field_or_title}"` 不属于上述运行时必填契约。实测删除全部列子节点的 Value 后，DataGrid 仍可创建，不会触发该空引用。
- 但当 MasterGo Table 明确提供某列的字段或标题时，为保证该列显示/绑定完整，应填写对应子节点 Value；没有可靠字段/标题来源时不得编造，应标记为待业务确认。这里属于组件映射完整性要求，不是 DataGrid 加载器的必填要求。

# 固定字段与可选字段规则

> 生成门禁：`Height` 与 `FontSize` 必须分开处理。组件实例映射出的文本控件可以按项目约定使用 `Height="40"`，但只要 DSL 提供 `styles.font_*/value/size`，就必须把该 `size` 写入 `FontSize`；不能因为统一组件高度而省略字号。

- 固定：ControlType、节点数量、父子关系、槽位顺序。
- 可填：Value、Left、Top、Width、Height、FontSize、字体/颜色/Style。一般显示型子节点缺少 Value 时控件仍会生成，但文字内容为空；**DataGrid 根节点例外，其 Value 属性必填且最终值必须非空**。Style 只有 MasterGo 明确提供且代码库存在对应资源键时才填写。只有当 MasterGo 层级明确存在父级容器并且该父级有样式选择器时，才由父级为子控件提供样式；不得根据外观或组件名称自行添加父级容器。
- 运行时：IOName、IOCommand、PageName、IOEnable、IOState、LangName。
- ID 按 MX_GUID/Pin 规则生成，不复制 MasterGo layer ID。

# 页面生成总规则

1. 识别组件集及实例属性。
2. 按完整层级匹配唯一固定模板。
3. 按节点语义、顺序、坐标、尺寸、字体和间距填充字段。
4. 缺少业务字段保留空值并标记待配置；无模板则标记未映射，不静默替换。

# 转码专项规则：文本尺寸与顶部示例标题

## TextBlock 高度

IOContorl 的 `ControlType="TextBlock"` 高度必须按所属组件实例实际高度处理：当前项目默认 `Height="40"`，输入框 36/32 变体使用对应实例高度；独立文本节点才使用自身 bbox。`FontSize` 必须单独从 MasterGo DSL 的字体样式 `styles.font_*/value/size` 读取，不能用字号反推 Height。没有真实 bbox 时才使用框架默认高度，并记录 `heightFallback=true`。

## 字体大小与控件边界硬门禁

- `FontSize` 是排版属性，只表示字形字号；`Height` 是布局属性，只表示 IOContorl/组件实例的边界高度。两者必须分别取源数据，互不替代。
- 禁止任何生成逻辑执行 `Height = FontSize`，也禁止用字号、行高、文字长度或居中效果推导控件高度。典型结果可以是 `FontSize="16" Height="40"`。
- 输入框的外框 `Height` 必须取输入框自身 MasterGo bbox 或 `40/36/32` 高度变体；同一行的标题、数值、单位 TextBlock 按所属组件行高处理。若没有真实高度，只能使用项目默认值并标记 `heightFallback=true`。

## 顶部示例标题

位于页面根节点或展示外壳、仅用于组件展示/工件示教的最上方标题（例如“工件边缘示教（2.2.1.E）”）标记为 `design-artifact-title`，默认不生成到业务 XML。业务内容容器内部且运行时明确需要的标题才保留。被剥离或保留的标题必须记录节点 ID 和原因。
