<title>MasterGo 组件库 → MTSLG IOContorl 映射标准</title>

匹配键优先使用“独立组件集名称 + MasterGo 公开变体/属性名 + 真实属性值”；只有 MasterGo 明确存在组合父子关系时，才使用“完整父节点语义 + 公开属性名 + 真实属性值”。组件集 ID、实例 ID 和设计师自定义名称只作为读取追踪信息，不参与唯一匹配；匹配键负责命中固定模板，ControlType、节点数量、父子关系和槽位顺序由模板固定，花括号字段由对应 MasterGo 节点或业务配置填充。

坐标、父子层级和裁剪边界属于通用转码规则，详见下方“坐标与容器边界规则”。本段不重复展开实例公式。

# 组件层级身份规则

优先识别独立组件集，再读取该组件的公开变体/属性和真实属性值；只有 MasterGo 明确存在组合父子关系时，才使用完整父节点语义参与匹配。

组件匹配优先识别独立组件集，再读取实例变体和公开属性；输入框、选择框等独立组件不再默认归入“左标题+右信息”。

匹配键示例：组件集=输入框 + 变体=输入框-整数-40；高度只映射到 Height，不改变 ControlType。

# MasterGo 组件集：输入框 → MTSLG 映射关系

“输入框”现在是独立的 MasterGo 组件集，不再作为“左标题+右信息”的嵌套变体处理。匹配时直接识别输入框组件集、公开变体和真实高度值。

### 匹配规则

- 输入框本体单独生成，不把标题或单位合并进输入框的 ControlType。
- 变体名称中的 `-40`、`-36`、`-32`、`-28` 只表示设计尺寸高度，不产生新的代码控件类型。
- 当前项目默认高度为 40；只有 MasterGo 明确使用 36、32 或 28 时，才将对应高度写入 `Height`。

### 固定模板：组件集=输入框，变体=整数

MasterGo 变体：输入框-整数-40、输入框-整数-36、输入框-整数-32、输入框-整数-28。四者代码映射固定为 `IntNumberBox`，仅尺寸不同。

```
<IOContorl ID="{id_input}" IOName="{io_name}" ControlType="IntNumberBox" IOState="{state}" IOEnable="{enable}" Value="{value}" DefaultValue="{default_value}" MinValue="{min_value}" MaxValue="{max_value}" IOCommand="{io_command}" Left="{left}" Top="{top}" Width="{width}" Height="{height}" FontSize="{font_size}" />
```

例如高度 40 的整数输入框仍使用 `ControlType="IntNumberBox"`；高度 36、32 或 28 时只修改 `Height`。

### 固定模板：组件集=输入框，变体=小数

MasterGo 变体：输入框-小数-40、输入框-小数-36、输入框-小数-32、输入框-小数-28。四者代码映射固定为 `NumberBox`，精度由输入属性或项目规则提供。

```
<IOContorl ID="{id_input}" IOName="{io_name}" ControlType="NumberBox" IOState="{state}" IOEnable="{enable}" Value="{value}" DefaultValue="{default_value}" MinValue="{min_value}" MaxValue="{max_value}" IOCommand="{io_command}" Left="{left}" Top="{top}" Width="{width}" Height="{height}" FontSize="{font_size}" />
```

### 固定模板：组件集=输入框，变体=文字

MasterGo 变体：输入框-文字-40、输入框-文字-36、输入框-文字-32、输入框-文字-28。四者代码映射固定为 `TextBox`；标题、占位提示和其他说明文字仍分别使用独立的 `TextBlock`。

```
<IOContorl ID="{id_input}" IOName="{io_name}" ControlType="TextBox" IOState="{state}" IOEnable="{enable}" LangName="{lang_name}" Value="{value}" IOCommand="{io_command}" Left="{left}" Top="{top}" Width="{width}" Height="{height}" FontSize="{font_size}" />
```

### 待确认变体：组件集=输入框，变体=密码输入框

MasterGo 组件库已存在真实变体 `密码输入框`，但当前 MT3.0 IOContorl 控件契约和目标项目 XML 中没有确认的 `PasswordBox` ControlType 或正式密码属性模板。该变体暂标记为待确认；未确认前解析器必须失败，不得降级为 `TextBox`。

# MasterGo 组件集：选择框 → MTSLG 映射关系

### 匹配规则

- MasterGo 真实变体为 `选择框-40`、`选择框-36`、`选择框-32`、`选择框-28`。
- 四个变体均生成一个 `ComboBox` IOContorl；变体后缀只决定自身 `Height`。
- 选择框内部的下拉箭头 PATH 属于 ComboBox 内部视觉结构，不拆成独立 IOContorl；若目标控件需要图标，应由 ComboBox 样式提供。

### 固定模板：组件集=选择框，变体=选择框-40/选择框-36/选择框-32/选择框-28

固定节点：一个 ComboBox IOContorl；ControlType 固定为 `ComboBox`，节点数量和父子关系固定；`Height` 分别来自对应变体的 40、36、32、28。

```xml
<IOContorl ID="{id_combo}" IOName="{io_name}" ControlType="ComboBox" IOState="{state}" IOEnable="{enable}" Value="{selected_value}" IOCommand="{io_command}" Left="{left}" Top="{top}" Width="{width}" Height="{height}" FontSize="{font_size}">{combo_items}</IOContorl>
```

字段来源：选择框实例→`Value`、位置和尺寸→`Left/Top/Width/Height`、业务字段/动作→`IOName/IOCommand`；MasterGo 未提供的可选字段字段缺失时保留对应 XML 属性并输出空字符串值。

# 坐标与容器边界规则

> **全局固定常量：`contentOriginY = 192px`。** 本适配器所有业务页面根级 `Top/Y` 必须按 `pageAbsY - 192` 输出；不得把 192 改成页面级配置，也不得对嵌套控件重复扣除。

## 页面根级坐标归一

- 本项目页面顶部公共栏固定为 126px，根级设计稿标题固定为 66px，标题始终按 design-artifact-title 剥离。
- 因此根级保留业务节点的 Top/Y 统一按 MasterGo 原始坐标减 192px；192px 是当前项目固定约定，不设置“标题保留时扣 126px”的分支，也不需要在映射 JSON 中配置。
- 该偏移只作用于根级坐标，不改变 Width/Height；嵌套控件使用父子相对坐标，不重复扣除页面偏移。

## 组件父子相对坐标

根级或已展开为同级的 MasterGo 节点使用内容区坐标：`Left = pageAbsX - contentOriginX`、`Top = pageAbsY - 192`。保留父容器的嵌套子节点使用父节点相对坐标：`Left = pageAbsX - parentPageAbsX`、`Top = pageAbsY - parentPageAbsY`；页面偏移只在根级归一化时扣除一次。父子链必须同时用于确认真实结构、裁剪边界和来源，不能把子节点相对坐标误当作根级绝对坐标。

根组件实例的 Left/Top 先按页面公共偏移归一化；保留嵌套的子控件再按其直接父节点换算相对坐标，不重复扣除父节点坐标或页面偏移。不同组件实例必须分别读取和计算，固定模板只决定结构、ControlType 和槽位顺序，不决定实例坐标。

## overflow=hidden 与裁剪边界

当一次性 `getDsl` 完整响应中的根节点或对应容器节点 `overflow` 为 hidden 时，必须保留对应的外层布局容器及其 Width/Height 裁剪边界。内部子控件的最终位置仍按递归计算出的页面绝对 bbox 和内容区公式计算；相对坐标只能作为父子关系核对信息，不能替代最终 Left/Top。

只有在根组件没有裁剪需求时，才允许将语义槽位展开为同级节点。若展开为同级节点，必须显式保留等价的裁剪边界；否则超出外层组件的文字可能与相邻实例重叠。该裁剪规则优先于“平级节点”的模板书写形式。

# MasterGo 组件集：选择+信息 → MTSLG 映射关系

### 匹配规则

组件集=选择+信息；属性 1 决定选择控件类型和选中状态：单选-选中/未选择→RadioButton，多选-选中/未选中→CheckBox。

### 固定模板：组件集=选择+信息

固定节点：选择控件 + TextBlock，两个平级节点。

```
<!-- 属性1=单选-选中/未选择：默认圆点 RadioButton，使用隐式 RadioButtonBaseStyle -->
<IOContorl ID="{id_choice}" ControlType="RadioButton" Value="{checked}" IOName="{io_name}" IOCommand="{io_command}" IOEnable="{io_enable}" IOState="{io_state}" Left="{choice_left}" Top="{choice_top}" Width="{choice_width}" Height="{choice_height}" />
<IOContorl ID="{id_text}" ControlType="TextBlock" Value="{info_value}" IOState="{text_state}" IOEnable="{text_enable}" Left="{text_left}" Top="{text_top}" Width="{text_width}" Height="40" FontSize="{text_font_size}" />

<!-- 属性1=多选-选中/未选中：默认 CheckBox 样式 -->
<IOContorl ID="{id_choice}" ControlType="CheckBox" Value="{checked}" IOName="{io_name}" IOCommand="{io_command}" IOEnable="{io_enable}" IOState="{io_state}" Left="{choice_left}" Top="{choice_top}" Width="{choice_width}" Height="{choice_height}" />
<IOContorl ID="{id_text}" ControlType="TextBlock" Value="{info_value}" IOState="{text_state}" IOEnable="{text_enable}" Left="{text_left}" Top="{text_top}" Width="{text_width}" Height="40" FontSize="{text_font_size}" />
```

# MasterGo 组件集：单选+多选 → MTSLG 映射关系

### 匹配规则

组件集=单选+多选；属性 1 决定 ControlType 和状态：单选-选中/未选择→RadioButton，多选-选中/未选择→CheckBox。

### 固定模板：组件集=单选+多选

固定节点：一个选择控件 IOContorl，无 TextBlock 子节点。

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

### 匹配规则

组件集=信息分组-模块化。

### 固定模板：组件集=信息分组-模块化

固定节点：一个固定 GroupBox 外壳；该组件对外只有两个业务参数：标题名称→Header；多语言资源→LangName（由 Header 查资源库）。内部子节点不是 GroupBox 的可变类型参数，按子组件模板展开。

```
<IOContorl ID="{id_group}" IOName="" ControlType="GroupBox" IOEnable="{io_enable}" Header="{header}" LangName="{lang_name}" MinValue="" MaxValue="" Left="{left}" Top="{top}" Width="{width}" Height="{height}">{child_io_controls}</IOContorl>
```

- MasterGo 根组件名称/实例名称→组件身份，不写入 Header。
- 根组件内标题 TEXT（例如“周期名称”）→Header；再由 Header 查询对应 LangName。
- GroupBox 的位置、宽高来自根组件；组内子控件按各自模板生成，使用相对坐标。

信息分组内部的 TabControl/TabItem 只有在 MasterGo DSL 明确给出组件集、真实属性值、父子链和槽位来源后才展开；当前没有独立的正式变体模板，未确认时不生成占位 Tab 节点。

# MasterGo 控件类型：IconButton → MTSLG 映射规则（按父节点分流）

## 父节点=右侧栏：IconButton 按钮族映射关系

### 匹配规则

- 父节点语义必须完整读取，区分“右侧栏-左右结构”和“右侧栏-上下结构”；不能只写“左右结构/上下结构”。
- 父节点=右侧栏-上下结构，变量属性名=按钮类型，变量值=startstop（对应上下结构实例）→ Style 固定为 UpDownRightButtonStyle。
- 父节点=右侧栏-左右结构，命中普通左右结构实例 → Style 固定为 RightButtonStyle；该结论只适用于右侧栏，不适用于中间区域。

### 固定模板：父节点=右侧栏-左右结构

固定节点：一个 IconButton IOContorl；ControlType 固定为 IconButton，Style 固定为 RightButtonStyle，节点数量、父子关系和槽位顺序固定。

```xml
<IOContorl ID="{id}" IOName="{io_name}" IOCommand="{io_command}" ControlType="IconButton" Style="RightButtonStyle" Icon="{icon}" IconHeight="{icon_height}" IconWidth="{icon_width}" TopLeftContent="{top_left_content}" IOEnable="{io_enable}" IOState="{io_state}" LangName="{lang_name}" Value="{value}" Left="{left}" Top="{top}" Width="{width}" Height="{height}" />
```

文案→Value；业务字段/动作→IOName/IOCommand；图标→Icon/IconHeight/IconWidth；F1/F2/F10→TopLeftContent；MasterGo 未提供或目标项目未确认的可选属性字段缺失时保留对应 XML 属性并输出空字符串值。Icon 键可使用目标项目已确认键或当前页面唯一的临时 Geometry 键。

### 固定模板：父节点=右侧栏-上下结构

固定节点：一个 IconButton IOContorl；ControlType 固定为 IconButton，Style 固定为 UpDownRightButtonStyle，节点数量、父子关系和槽位顺序固定。

```xml
<IOContorl ID="{id}" IOName="{io_name}" IOCommand="{io_command}" ControlType="IconButton" Style="UpDownRightButtonStyle" Icon="{icon}" IconHeight="{icon_height}" IconWidth="{icon_width}" TopLeftContent="{top_left_content}" IOEnable="{io_enable}" IOState="{io_state}" LangName="{lang_name}" Value="{value}" Left="{left}" Top="{top}" Width="{width}" Height="{height}" />
```

固定模板：按钮类型=startstop。文案→Value；业务字段/动作→IOName/IOCommand；图标→Icon/IconHeight/IconWidth；F1/F2/F10→TopLeftContent；MasterGo 未提供的可选属性字段缺失时保留对应 XML 属性并输出空字符串值。

## 界面内操作组：IconButton 映射关系

### 匹配规则

- 匹配键使用组件实例公开属性“属性 1”及其真实属性值，不使用节点名称或外观语义推断。
- 属性 1=加减快捷键-无标题、加减快捷键操作-2有标题、加减快捷操作-有标题时，按钮固定使用 ControlType=IconButton、Style=SmallButton。
- 上述三个属性值对应的按钮均无图标；不得生成 Icon、IconWidth、IconHeight。
- 其余真实属性值按各自固定模板命中：轴操作、轴操作-快慢、方向、图像移动-单侧、图像移动-双侧、缺口位置、拟合数据-双侧上下、拟合数据-前后、拟合数据-单侧上下、扫描；不得使用未定义的“其他”兜底模板。除三个加减快捷属性值外，其余按钮均使用默认 IconButton 并省略 Style；图标属性仅由对应 MasterGo 节点的真实图标槽位决定。

### 固定模板：属性 1=加减快捷键-无标题

固定节点：四个 IconButton IOContorl 和两个 TextBlock IOContorl；按钮 ControlType 固定为 IconButton，Style 固定为 SmallButton；文本 ControlType 固定为 TextBlock；四个按钮与数值、方向文本的槽位顺序和父子关系固定；所有按钮无图标属性。

```xml
<IOContorl ID="{button_plus_5_id}" IOName="{button_plus_5_io_name}" IOCommand="{button_plus_5_io_command}" ControlType="IconButton" Style="SmallButton" IOEnable="{button_plus_5_enable}" IOState="{button_plus_5_state}" LangName="{button_plus_5_lang}" Value="{button_plus_5_value}" Left="{button_plus_5_left}" Top="{button_plus_5_top}" Width="{button_plus_5_width}" Height="{button_plus_5_height}" />
<IOContorl ID="{button_minus_5_id}" IOName="{button_minus_5_io_name}" IOCommand="{button_minus_5_io_command}" ControlType="IconButton" Style="SmallButton" IOEnable="{button_minus_5_enable}" IOState="{button_minus_5_state}" LangName="{button_minus_5_lang}" Value="{button_minus_5_value}" Left="{button_minus_5_left}" Top="{button_minus_5_top}" Width="{button_minus_5_width}" Height="{button_minus_5_height}" />
<IOContorl ID="{button_plus_1_id}" IOName="{button_plus_1_io_name}" IOCommand="{button_plus_1_io_command}" ControlType="IconButton" Style="SmallButton" IOEnable="{button_plus_1_enable}" IOState="{button_plus_1_state}" LangName="{button_plus_1_lang}" Value="{button_plus_1_value}" Left="{button_plus_1_left}" Top="{button_plus_1_top}" Width="{button_plus_1_width}" Height="{button_plus_1_height}" />
<IOContorl ID="{button_minus_1_id}" IOName="{button_minus_1_io_name}" IOCommand="{button_minus_1_io_command}" ControlType="IconButton" Style="SmallButton" IOEnable="{button_minus_1_enable}" IOState="{button_minus_1_state}" LangName="{button_minus_1_lang}" Value="{button_minus_1_value}" Left="{button_minus_1_left}" Top="{button_minus_1_top}" Width="{button_minus_1_width}" Height="{button_minus_1_height}" />
<IOContorl ID="{value_id}" ControlType="TextBlock" LangName="{value_lang}" Value="{display_value}" Left="{value_left}" Top="{value_top}" Width="{value_width}" Height="40" />
<IOContorl ID="{direction_id}" ControlType="TextBlock" LangName="{direction_lang}" Value="{direction}" Left="{direction_left}" Top="{direction_top}" Width="{direction_width}" Height="40" />
```

按钮文案（例如 +5、-5、+1、-1）分别从对应 TEXT 节点读取并填入 Value；数值和方向文本分别从真实 TEXT 节点读取并填入对应 TextBlock.Value。业务字段/动作、状态、位置和尺寸从对应 MasterGo 节点读取；文本位置和尺寸也从各自节点 bbox 读取。不得生成 Icon、IconWidth、IconHeight；MasterGo 未提供的其他可选属性字段缺失时保留对应 XML 属性并输出空字符串值。

### 固定模板：属性 1=加减快捷键操作-2有标题

固定节点：四个 IconButton IOContorl 和两个 TextBlock IOContorl；按钮 ControlType 固定为 IconButton，Style 固定为 SmallButton；文本 ControlType 固定为 TextBlock；四个按钮与标题、数值文本的槽位顺序和父子关系固定；所有按钮无图标属性。

```xml
<IOContorl ID="{button_plus_5_id}" IOName="{button_plus_5_io_name}" IOCommand="{button_plus_5_io_command}" ControlType="IconButton" Style="SmallButton" IOEnable="{button_plus_5_enable}" IOState="{button_plus_5_state}" LangName="{button_plus_5_lang}" Value="{button_plus_5_value}" Left="{button_plus_5_left}" Top="{button_plus_5_top}" Width="{button_plus_5_width}" Height="{button_plus_5_height}" />
<IOContorl ID="{button_minus_5_id}" IOName="{button_minus_5_io_name}" IOCommand="{button_minus_5_io_command}" ControlType="IconButton" Style="SmallButton" IOEnable="{button_minus_5_enable}" IOState="{button_minus_5_state}" LangName="{button_minus_5_lang}" Value="{button_minus_5_value}" Left="{button_minus_5_left}" Top="{button_minus_5_top}" Width="{button_minus_5_width}" Height="{button_minus_5_height}" />
<IOContorl ID="{button_plus_1_id}" IOName="{button_plus_1_io_name}" IOCommand="{button_plus_1_io_command}" ControlType="IconButton" Style="SmallButton" IOEnable="{button_plus_1_enable}" IOState="{button_plus_1_state}" LangName="{button_plus_1_lang}" Value="{button_plus_1_value}" Left="{button_plus_1_left}" Top="{button_plus_1_top}" Width="{button_plus_1_width}" Height="{button_plus_1_height}" />
<IOContorl ID="{button_minus_1_id}" IOName="{button_minus_1_io_name}" IOCommand="{button_minus_1_io_command}" ControlType="IconButton" Style="SmallButton" IOEnable="{button_minus_1_enable}" IOState="{button_minus_1_state}" LangName="{button_minus_1_lang}" Value="{button_minus_1_value}" Left="{button_minus_1_left}" Top="{button_minus_1_top}" Width="{button_minus_1_width}" Height="{button_minus_1_height}" />
<IOContorl ID="{title_id}" ControlType="TextBlock" LangName="{title_lang}" Value="{title}" Left="{title_left}" Top="{title_top}" Width="{title_width}" Height="40" />
<IOContorl ID="{value_id}" ControlType="TextBlock" LangName="{value_lang}" Value="{display_value}" Left="{value_left}" Top="{value_top}" Width="{value_width}" Height="40" />
```

四个按钮文案（例如 +5、-5、+1、-1）分别从对应 TEXT 节点读取并填入 Value；标题和数值文本分别从真实 TEXT 节点读取并填入对应 TextBlock.Value。按钮业务字段/动作、状态、位置和尺寸从对应 MasterGo 节点读取；文本位置和尺寸也从各自节点 bbox 读取。不得生成 Icon、IconWidth、IconHeight；MasterGo 未提供的可选属性字段缺失时保留对应 XML 属性并输出空字符串值。

### 固定模板：属性 1=加减快捷操作-有标题

固定节点：四个 IconButton IOContorl 和三个 TextBlock IOContorl；按钮 ControlType 固定为 IconButton，Style 固定为 SmallButton；文本 ControlType 固定为 TextBlock；四个按钮、标题文本、数值文本和方向文本的父子关系、槽位顺序固定；所有按钮无图标属性。

```xml
<IOContorl ID="{button_plus_5_id}" IOName="{button_plus_5_io_name}" IOCommand="{button_plus_5_io_command}" ControlType="IconButton" Style="SmallButton" IOEnable="{button_plus_5_enable}" IOState="{button_plus_5_state}" LangName="{button_plus_5_lang}" Value="{button_plus_5_value}" Left="{button_plus_5_left}" Top="{button_plus_5_top}" Width="{button_plus_5_width}" Height="{button_plus_5_height}" />
<IOContorl ID="{button_minus_5_id}" IOName="{button_minus_5_io_name}" IOCommand="{button_minus_5_io_command}" ControlType="IconButton" Style="SmallButton" IOEnable="{button_minus_5_enable}" IOState="{button_minus_5_state}" LangName="{button_minus_5_lang}" Value="{button_minus_5_value}" Left="{button_minus_5_left}" Top="{button_minus_5_top}" Width="{button_minus_5_width}" Height="{button_minus_5_height}" />
<IOContorl ID="{button_plus_1_id}" IOName="{button_plus_1_io_name}" IOCommand="{button_plus_1_io_command}" ControlType="IconButton" Style="SmallButton" IOEnable="{button_plus_1_enable}" IOState="{button_plus_1_state}" LangName="{button_plus_1_lang}" Value="{button_plus_1_value}" Left="{button_plus_1_left}" Top="{button_plus_1_top}" Width="{button_plus_1_width}" Height="{button_plus_1_height}" />
<IOContorl ID="{button_minus_1_id}" IOName="{button_minus_1_io_name}" IOCommand="{button_minus_1_io_command}" ControlType="IconButton" Style="SmallButton" IOEnable="{button_minus_1_enable}" IOState="{button_minus_1_state}" LangName="{button_minus_1_lang}" Value="{button_minus_1_value}" Left="{button_minus_1_left}" Top="{button_minus_1_top}" Width="{button_minus_1_width}" Height="{button_minus_1_height}" />
<IOContorl ID="{title_id}" ControlType="TextBlock" LangName="{title_lang}" Value="{title}" Left="{title_left}" Top="{title_top}" Width="{title_width}" Height="40" />
<IOContorl ID="{value_id}" ControlType="TextBlock" LangName="{value_lang}" Value="{display_value}" Left="{value_left}" Top="{value_top}" Width="{value_width}" Height="40" />
<IOContorl ID="{direction_id}" ControlType="TextBlock" LangName="{direction_lang}" Value="{direction}" Left="{direction_left}" Top="{direction_top}" Width="{direction_width}" Height="40" />
```

四个按钮文案（例如 +5、-5、+1、-1）分别从对应 TEXT 节点读取并填入 Value；标题、数值和方向文本分别从真实 TEXT 节点读取并填入对应 TextBlock 的 Value。按钮业务字段/动作、状态、位置和尺寸从对应 MasterGo 节点读取；文本位置和尺寸也从各自节点 bbox 读取。不得生成 Icon、IconWidth、IconHeight；MasterGo 未提供的其他可选属性字段缺失时保留对应 XML 属性并输出空字符串值。

该规则的真实子节点关系为：四个按钮子节点名称均为 `按钮`，按父节点链和组件内顺序区分；按钮内部 TEXT 节点写入对应 IconButton.Value。与按钮平级的主标题 TEXT 节点生成独立 TextBlock；组 2525 内的 TEXT 节点也分别生成独立 TextBlock。主标题可见性由实例属性控制，不影响按钮 Value 文本或组内独立文本。

该组件的 `显示主标题` 和 `显示左侧副标题` 都是文本可见性开关：属性为 true 时，沿当前实例父子链读取对应的主标题/左侧副标题 TEXT 节点并各自生成独立 TextBlock；属性为 false 时省略对应文本节点。主标题和左侧副标题都不是按钮 Value，不得从按钮文案或坐标推断文本。

### 固定模板：属性 1=轴操作、轴操作-快慢

固定节点：四个 IconButton IOContorl 和一个 TextBlock IOContorl；按钮 ControlType 固定为 IconButton，Style 属性省略；文本 ControlType 固定为 TextBlock；四个按钮与 SCAN 文本的槽位顺序和父子关系固定。

```xml
<IOContorl ID="{up_id}" IOName="{up_io_name}" IOCommand="{up_io_command}" ControlType="IconButton" Icon="{up_icon}" IconHeight="{up_icon_height}" IconWidth="{up_icon_width}" IOEnable="{up_enable}" IOState="{up_state}" Value="{up_value}" Left="{up_left}" Top="{up_top}" Width="{up_width}" Height="{up_height}" />
<IOContorl ID="{left_id}" IOName="{left_io_name}" IOCommand="{left_io_command}" ControlType="IconButton" Icon="{left_icon}" IconHeight="{left_icon_height}" IconWidth="{left_icon_width}" IOEnable="{left_enable}" IOState="{left_state}" Value="{left_value}" Left="{left_left}" Top="{left_top}" Width="{left_width}" Height="{left_height}" />
<IOContorl ID="{right_id}" IOName="{right_io_name}" IOCommand="{right_io_command}" ControlType="IconButton" Icon="{right_icon}" IconHeight="{right_icon_height}" IconWidth="{right_icon_width}" IOEnable="{right_enable}" IOState="{right_state}" Value="{right_value}" Left="{right_left}" Top="{right_top}" Width="{right_width}" Height="{right_height}" />
<IOContorl ID="{down_id}" IOName="{down_io_name}" IOCommand="{down_io_command}" ControlType="IconButton" Icon="{down_icon}" IconHeight="{down_icon_height}" IconWidth="{down_icon_width}" IOEnable="{down_enable}" IOState="{down_state}" Value="{down_value}" Left="{down_left}" Top="{down_top}" Width="{down_width}" Height="{down_height}" />
<IOContorl ID="{scan_id}" ControlType="TextBlock" Value="{scan_text}" Left="{scan_left}" Top="{scan_top}" Width="{scan_width}" Height="40" />
```

四个按钮的图标、文案、业务字段/动作、状态、位置和尺寸从对应 MasterGo 节点读取；SCAN 文本节点填入 TextBlock.Value。存在图标槽位时生成 Icon、IconHeight、IconWidth；未提供的可选字段字段缺失时保留对应 XML 属性并输出空字符串值。

本组件集的固定真实子节点顺序为：

- `组 1504`：上方向按钮；Icon 来源为组 1521；
- `组 1524`：左方向按钮；Icon 来源为组 1525；
- `组 1526`：右方向按钮；Icon 来源为组 1526；
- `组 2526`：下方向按钮；Icon 来源为组 1522；
- `scan`：独立 TEXT 节点，单独生成 TextBlock，不并入任一方向按钮的 Value。

按钮的 `Left/Top/Width/Height` 必须读取四个按钮外层节点 bbox；内部图标组只提供 Icon 来源和图标尺寸，不得用内部图标 bbox 代替按钮尺寸。实例文本、图标和坐标均从当前实例的真实父子链读取。

### 固定模板：属性 1=方向

固定节点：四个 IconButton IOContorl；ControlType 固定为 IconButton，Style 属性省略；每个按钮包含两个图标槽位，按钮顺序和父子关系固定。

```xml
<IOContorl ID="{up_pair_id}" IOName="{up_pair_io_name}" IOCommand="{up_pair_io_command}" ControlType="IconButton" Icon="{up_pair_icon}" IconHeight="{up_pair_icon_height}" IconWidth="{up_pair_icon_width}" IOEnable="{up_pair_enable}" IOState="{up_pair_state}" Value="{up_pair_value}" Left="{up_pair_left}" Top="{up_pair_top}" Width="{up_pair_width}" Height="{up_pair_height}" />
<IOContorl ID="{down_pair_id}" IOName="{down_pair_io_name}" IOCommand="{down_pair_io_command}" ControlType="IconButton" Icon="{down_pair_icon}" IconHeight="{down_pair_icon_height}" IconWidth="{down_pair_icon_width}" IOEnable="{down_pair_enable}" IOState="{down_pair_state}" Value="{down_pair_value}" Left="{down_pair_left}" Top="{down_pair_top}" Width="{down_pair_width}" Height="{down_pair_height}" />
<IOContorl ID="{vertical_pair_id}" IOName="{vertical_pair_io_name}" IOCommand="{vertical_pair_io_command}" ControlType="IconButton" Icon="{vertical_pair_icon}" IconHeight="{vertical_pair_icon_height}" IconWidth="{vertical_pair_icon_width}" IOEnable="{vertical_pair_enable}" IOState="{vertical_pair_state}" Value="{vertical_pair_value}" Left="{vertical_pair_left}" Top="{vertical_pair_top}" Width="{vertical_pair_width}" Height="{vertical_pair_height}" />
<IOContorl ID="{horizontal_pair_id}" IOName="{horizontal_pair_io_name}" IOCommand="{horizontal_pair_io_command}" ControlType="IconButton" Icon="{horizontal_pair_icon}" IconHeight="{horizontal_pair_icon_height}" IconWidth="{horizontal_pair_icon_width}" IOEnable="{horizontal_pair_enable}" IOState="{horizontal_pair_state}" Value="{horizontal_pair_value}" Left="{horizontal_pair_left}" Top="{horizontal_pair_top}" Width="{horizontal_pair_width}" Height="{horizontal_pair_height}" />
```

四个按钮分别对应真实的方向图标槽位；图标、业务字段/动作、状态、文案、位置和尺寸逐节点读取。没有真实 Value 或可选字段时删除对应属性。

### 固定模板：属性 1=图像移动-单侧

固定节点：四个 IconButton IOContorl；ControlType 固定为 IconButton，Style 属性省略；按钮顺序和父子关系固定。

```xml
<IOContorl ID="{up_id}" IOName="{up_io_name}" IOCommand="{up_io_command}" ControlType="IconButton" Icon="{up_icon}" IconHeight="{up_icon_height}" IconWidth="{up_icon_width}" IOEnable="{up_enable}" IOState="{up_state}" Value="{up_value}" Left="{up_left}" Top="{up_top}" Width="{up_width}" Height="{up_height}" />
<IOContorl ID="{left_id}" IOName="{left_io_name}" IOCommand="{left_io_command}" ControlType="IconButton" Icon="{left_icon}" IconHeight="{left_icon_height}" IconWidth="{left_icon_width}" IOEnable="{left_enable}" IOState="{left_state}" Value="{left_value}" Left="{left_left}" Top="{left_top}" Width="{left_width}" Height="{left_height}" />
<IOContorl ID="{right_id}" IOName="{right_io_name}" IOCommand="{right_io_command}" ControlType="IconButton" Icon="{right_icon}" IconHeight="{right_icon_height}" IconWidth="{right_icon_width}" IOEnable="{right_enable}" IOState="{right_state}" Value="{right_value}" Left="{right_left}" Top="{right_top}" Width="{right_width}" Height="{right_height}" />
<IOContorl ID="{down_id}" IOName="{down_io_name}" IOCommand="{down_io_command}" ControlType="IconButton" Icon="{down_icon}" IconHeight="{down_icon_height}" IconWidth="{down_icon_width}" IOEnable="{down_enable}" IOState="{down_state}" Value="{down_value}" Left="{down_left}" Top="{down_top}" Width="{down_width}" Height="{down_height}" />
```

四个方向按钮的图标、业务字段/动作、状态、文案、位置和尺寸逐节点读取；MasterGo 未提供的可选属性字段缺失时保留对应 XML 属性并输出空字符串值。

该规则对应组件集=图像移动-单侧、属性 1=图像移动-单侧。固定真实子节点名称为：`按钮-指向上`（外层组 1504，Icon 来源组 1521）、`按钮-指向左`（外层组 1524，Icon 来源组 1525）、`按钮-指向右`（外层组 1526，Icon 来源组 1527）、`按钮-指向下`（外层组 2526，Icon 来源组 1523）。四个按钮的 Width/Height 必须读取当前项目页面实例的各自外层按钮 bbox；内部图标组只用于 Icon，不得用于按钮尺寸。该组件没有独立文本槽位。

### 固定模板：属性 1=图像移动-双侧

固定节点：四个 IconButton IOContorl；ControlType 固定为 IconButton，Style 属性省略；每个按钮的双图标槽位、顺序和父子关系固定。

```xml
<IOContorl ID="{first_id}" IOName="{first_io_name}" IOCommand="{first_io_command}" ControlType="IconButton" Icon="{first_icon}" IconHeight="{first_icon_height}" IconWidth="{first_icon_width}" IOEnable="{first_enable}" IOState="{first_state}" Value="{first_value}" Left="{first_left}" Top="{first_top}" Width="{first_width}" Height="{first_height}" />
<IOContorl ID="{second_id}" IOName="{second_io_name}" IOCommand="{second_io_command}" ControlType="IconButton" Icon="{second_icon}" IconHeight="{second_icon_height}" IconWidth="{second_icon_width}" IOEnable="{second_enable}" IOState="{second_state}" Value="{second_value}" Left="{second_left}" Top="{second_top}" Width="{second_width}" Height="{second_height}" />
<IOContorl ID="{third_id}" IOName="{third_io_name}" IOCommand="{third_io_command}" ControlType="IconButton" Icon="{third_icon}" IconHeight="{third_icon_height}" IconWidth="{third_icon_width}" IOEnable="{third_enable}" IOState="{third_state}" Value="{third_value}" Left="{third_left}" Top="{third_top}" Width="{third_width}" Height="{third_height}" />
<IOContorl ID="{fourth_id}" IOName="{fourth_io_name}" IOCommand="{fourth_io_command}" ControlType="IconButton" Icon="{fourth_icon}" IconHeight="{fourth_icon_height}" IconWidth="{fourth_icon_width}" IOEnable="{fourth_enable}" IOState="{fourth_state}" Value="{fourth_value}" Left="{fourth_left}" Top="{fourth_top}" Width="{fourth_width}" Height="{fourth_height}" />
```

四个按钮的双图标槽位、业务字段/动作、状态、文案、位置和尺寸逐节点读取；未提供的可选属性字段缺失时保留对应 XML 属性并输出空字符串值。

该规则对应属性 1=图像移动-双侧。固定真实子节点名称和顺序为：`横按钮-指向外`、`竖按钮-指向外`、`竖按钮-指向内`、`横按钮-指向内`。四个按钮的 Width/Height 必须读取当前项目页面实例的各自外层按钮 bbox；每个按钮的两个 Icon 槽位均来自其内部组 1525。内部图标组 bbox 不得替代按钮外层 bbox，组件没有独立文本槽位。

### 固定模板：属性 1=缺口位置

固定节点：两个 IconButton IOContorl；ControlType 固定为 IconButton，Style 属性省略；左右按钮槽位顺序和父子关系固定。

```xml
<IOContorl ID="{left_id}" IOName="{left_io_name}" IOCommand="{left_io_command}" ControlType="IconButton" Icon="{left_icon}" IconHeight="{left_icon_height}" IconWidth="{left_icon_width}" IOEnable="{left_enable}" IOState="{left_state}" Value="{left_value}" Left="{left_left}" Top="{left_top}" Width="{left_width}" Height="{left_height}" />
<IOContorl ID="{right_id}" IOName="{right_io_name}" IOCommand="{right_io_command}" ControlType="IconButton" Icon="{right_icon}" IconHeight="{right_icon_height}" IconWidth="{right_icon_width}" IOEnable="{right_enable}" IOState="{right_state}" Value="{right_value}" Left="{right_left}" Top="{right_top}" Width="{right_width}" Height="{right_height}" />
```

左右按钮图标、业务字段/动作、状态、文案、位置和尺寸逐节点读取；未提供的可选属性字段缺失时保留对应 XML 属性并输出空字符串值。

该规则对应组件集=缺口位置、属性 1=缺口位置。固定真实子节点名称为：`按钮-指向左`（外层组 1524，Icon 来源组 1525）和 `按钮-指向右`（外层组 1526，Icon 来源组 1527）。两个按钮的外层 Width/Height 必须读取当前项目页面实例的真实按钮 bbox；组 1525/1527 只提供 Icon 来源，不得替代按钮尺寸。该组件没有独立文本槽位。

### 固定模板：属性 1=拟合数据-双侧上下

固定节点：两个 IconButton IOContorl；ControlType 固定为 IconButton，Style 属性省略；每个按钮为双图标槽位，按钮顺序和父子关系固定。

```xml
<IOContorl ID="{first_id}" IOName="{first_io_name}" IOCommand="{first_io_command}" ControlType="IconButton" Icon="{first_icon}" IconHeight="{first_icon_height}" IconWidth="{first_icon_width}" IOEnable="{first_enable}" IOState="{first_state}" Value="{first_value}" Left="{first_left}" Top="{first_top}" Width="{first_width}" Height="{first_height}" />
<IOContorl ID="{second_id}" IOName="{second_io_name}" IOCommand="{second_io_command}" ControlType="IconButton" Icon="{second_icon}" IconHeight="{second_icon_height}" IconWidth="{second_icon_width}" IOEnable="{second_enable}" IOState="{second_state}" Value="{second_value}" Left="{second_left}" Top="{second_top}" Width="{second_width}" Height="{second_height}" />
```

两个按钮的双图标槽位、业务字段/动作、状态、文案、位置和尺寸逐节点读取；未提供的可选属性字段缺失时保留对应 XML 属性并输出空字符串值。

该规则对应属性 1=拟合数据-双侧上下。两个真实子节点名称均为 `按钮`，按父节点链和组件内顺序区分第一、第二按钮。两个按钮的 Width/Height 必须读取当前项目页面实例的各自外层按钮 bbox；左按钮的双图标均来自组 1525，右按钮的双图标均来自组 1525。不能拆成独立按钮，也不能使用内部图标 bbox 代替按钮尺寸。该组件没有独立文本槽位。

### 固定模板：属性 1=拟合数据-前后

固定节点：两个 IconButton IOContorl；ControlType 固定为 IconButton，Style 属性省略；前后按钮顺序和父子关系固定。

```xml
<IOContorl ID="{front_id}" IOName="{front_io_name}" IOCommand="{front_io_command}" ControlType="IconButton" Icon="{front_icon}" IconHeight="{front_icon_height}" IconWidth="{front_icon_width}" IOEnable="{front_enable}" IOState="{front_state}" Value="{front_value}" Left="{front_left}" Top="{front_top}" Width="{front_width}" Height="{front_height}" />
<IOContorl ID="{back_id}" IOName="{back_io_name}" IOCommand="{back_io_command}" ControlType="IconButton" Icon="{back_icon}" IconHeight="{back_icon_height}" IconWidth="{back_icon_width}" IOEnable="{back_enable}" IOState="{back_state}" Value="{back_value}" Left="{back_left}" Top="{back_top}" Width="{back_width}" Height="{back_height}" />
```

前后按钮图标、业务字段/动作、状态、文案、位置和尺寸逐节点读取；未提供的可选属性字段缺失时保留对应 XML 属性并输出空字符串值。

该规则对应属性 1=拟合数据-前后。固定子节点名称必须按组件真实名称匹配：`按钮-指向左` 的外层按钮节点使用其实际 bbox，Icon 来源为内部组 1525；`按钮-指向右` 的外层按钮节点使用其实际 bbox，Icon 来源为内部组 1527。这里的“指向左/指向右”是组件子节点的正式名称，不只是语义方向别名。

### 固定模板：属性 1=拟合数据-单侧上下

固定节点：两个 IconButton IOContorl；ControlType 固定为 IconButton，Style 属性省略；上下按钮顺序和父子关系固定。

```xml
<IOContorl ID="{up_id}" IOName="{up_io_name}" IOCommand="{up_io_command}" ControlType="IconButton" Icon="{up_icon}" IconHeight="{up_icon_height}" IconWidth="{up_icon_width}" IOEnable="{up_enable}" IOState="{up_state}" Value="{up_value}" Left="{up_left}" Top="{up_top}" Width="{up_width}" Height="{up_height}" />
<IOContorl ID="{down_id}" IOName="{down_io_name}" IOCommand="{down_io_command}" ControlType="IconButton" Icon="{down_icon}" IconHeight="{down_icon_height}" IconWidth="{down_icon_width}" IOEnable="{down_enable}" IOState="{down_state}" Value="{down_value}" Left="{down_left}" Top="{down_top}" Width="{down_width}" Height="{down_height}" />
```

上下按钮图标、业务字段/动作、状态、文案、位置和尺寸逐节点读取；未提供的可选属性字段缺失时保留对应 XML 属性并输出空字符串值。

### 固定模板：属性 1=扫描

固定节点：一个 TextBlock IOContorl 和两个 IconButton IOContorl；文本与按钮的槽位顺序和父子关系固定，按钮 ControlType 固定为 IconButton，Style 属性省略，文本 ControlType 固定为 TextBlock。

```xml
<IOContorl ID="{scan_title_id}" ControlType="TextBlock" Value="{scan_title}" Left="{scan_title_left}" Top="{scan_title_top}" Width="{scan_title_width}" Height="40" />
<IOContorl ID="{left_id}" IOName="{left_io_name}" IOCommand="{left_io_command}" ControlType="IconButton" Icon="{left_icon}" IconHeight="{left_icon_height}" IconWidth="{left_icon_width}" IOEnable="{left_enable}" IOState="{left_state}" Value="{left_value}" Left="{left_left}" Top="{left_top}" Width="{left_width}" Height="{left_height}" />
<IOContorl ID="{right_id}" IOName="{right_io_name}" IOCommand="{right_io_command}" ControlType="IconButton" Icon="{right_icon}" IconHeight="{right_icon_height}" IconWidth="{right_icon_width}" IOEnable="{right_enable}" IOState="{right_state}" Value="{right_value}" Left="{right_left}" Top="{right_top}" Width="{right_width}" Height="{right_height}" />
```

扫描文本节点填入 TextBlock.Value；左右按钮图标、业务字段/动作、状态、文案、位置和尺寸逐节点读取。MasterGo 未提供的可选属性字段缺失时保留对应 XML 属性并输出空字符串值。

该规则对应属性 1=扫描。固定真实子节点名称为：TEXT `扫描` 单独生成 TextBlock；`按钮-指向左` 的外层按钮 Width/Height 读取当前实例 bbox，Icon 来源为组 1525；`按钮-指向右` 的外层按钮 Width/Height 读取当前实例 bbox，Icon 来源为组 1528。按钮 Icon 组不代替按钮尺寸，按钮没有独立文案 Value。

## 组件集=主菜单button：IconButton 映射关系

### 匹配规则

- 独立组件集名称=主菜单button；使用公开属性名“属性 1”及其真实属性值匹配，不使用组件集 ID、实例 ID 或图层名称作为匹配键。
- 属性 1=主菜单button 命中完整主菜单按钮模板；属性 1=主菜单button-文字 命中文本主菜单按钮模板。
- 组件实例的公开属性“显示F”控制 F 文本槽位，“显示icon”控制图标槽位；属性关闭时不生成对应槽位，也不把隐藏槽位单独输出为 TextBlock。

### 固定模板：属性 1=主菜单button

固定节点：一个 IconButton IOContorl；ControlType 固定为 IconButton，Style 固定为 MainButtonStyle。按钮文案固定写入 Value；显示F打开时，F 文本写入 TopLeftContent；显示icon打开时，图标写入 Icon。三个槽位都从当前实例的真实子节点读取，不能把组件内部槽位文本再独立生成一个 TextBlock。

```xml
<IOContorl ID="{id}" ControlType="IconButton" Style="MainButtonStyle" Icon="{icon}" TopLeftContent="{top_left_content}" Value="{value}" Left="{left}" Top="{top}" Width="{width}" Height="{height}" />
```

按钮文案→Value；F 文本→TopLeftContent；图标 PATH/SVG→Icon；位置、尺寸和字体事实从当前实例对应节点读取。显示F关闭时不生成 TopLeftContent；显示icon关闭时不生成 Icon。固定模板没有声明的业务字段不新增。

### 固定模板：属性 1=主菜单button-文字

固定节点：一个 IconButton IOContorl；ControlType 固定为 IconButton，Style 固定为 MainButtonStyle；只有文案槽位，文案写入 Value，不生成 Icon 或 TopLeftContent。

```xml
<IOContorl ID="{id}" ControlType="IconButton" Style="MainButtonStyle" Value="{value}" Left="{left}" Top="{top}" Width="{width}" Height="{height}" />
```

文案→Value；位置、尺寸和字体事实从当前实例的固定文本节点读取。该变体没有图标和 F 键槽位，不新增 Icon 或 TopLeftContent。

# MasterGo 组件集：Table → MTSLG 映射关系

### 匹配规则

- 独立识别 MasterGo 组件集 Table；组件集 ID 和实例 ID 只作来源追踪，不参与唯一匹配。
- 父节点、子节点关系和表格列顺序按 MasterGo 实际结构读取；若父节点明确是 TabControl，则外层按 TabControl/TabItem 规则处理，Table 子节点仍只映射为 DataGrid。
- 根节点数据源必须映射到非空 Value；无法确认数据源时标记待业务确认，不得省略或编造。

### 固定模板：组件集=Table

固定节点：一个 DataGrid IOContorl，可包含按 MasterGo 列结构展开的列定义子节点；根节点 ControlType 固定为 DataGrid，节点父子关系和列顺序固定。

```xml
<IOContorl ID="{id_table}" ControlType="DataGrid" IOName="{io_name}" IOCommand="{io_command}" Value="{data_source}" IOEnable="{io_enable}" IsAutoRefresh="{is_auto_refresh}" Style="{style_data_grid}" Left="{left}" Top="{top}" Width="{width}" Height="{height}">
<IOContorl ID="" ControlType="TextBlock" IOVisible="false" Value="{hidden_id_field}" Left="0" Top="0" />
<IOContorl ID="" IOName="{column_1_name}" ControlType="{column_1_control_type}" Value="{column_1_field}" MinValue="{column_1_min}" MaxValue="{column_1_max}" Left="{column_1_left}" Top="{column_1_top}" Width="{column_1_width}" Height="{column_1_height}" />
<IOContorl ID="" IOName="{column_2_name}" ControlType="{column_2_control_type}" Value="{column_2_field}" Left="{column_2_left}" Top="{column_2_top}" Width="{column_2_width}" Height="{column_2_height}" />
<!-- 按 MasterGo 表格列继续展开固定子节点 -->
</IOContorl>
```

字段来源：数据源→根节点 Value；业务字段/表标识→IOName；加载、刷新或选中动作→IOCommand；可用条件→IOEnable；自动刷新→IsAutoRefresh；位置和尺寸→Left/Top/Width/Height。Style 只填 MasterGo 节点实际提供且代码库已登记的样式。

列节点按 MasterGo 列结构展开：列字段/标题→子节点 Value，列业务字段→子节点 IOName，列控件类型固定为已登记的 TextBlock、NumberBox、IntNumberBox 等；隐藏主键列使用 IOVisible="false"。列子节点 Value 不是加载器必填项，但 MasterGo 明确提供字段或标题时应填写；没有可靠来源时标记待业务确认，不得编造。

# 固定字段与可选字段规则

- 固定：ControlType、节点数量、父子关系、槽位顺序。
- 几何/显示字段：Value、Left、Top、Width、Height、FontSize、字体/颜色/Style；其中 DSL 提供字体样式时 FontSize 必填，Height 与 FontSize 独立取值；MTSLG TextBlock 的 Height 固定为 40；输入框和选择框外框的 Height 按 MasterGo 的 40/36/32/28 变体处理；Height 与 FontSize 必须分别读取。一般显示型子节点缺少 Value 时控件仍会生成，但文字内容为空；**DataGrid 根节点例外，其 Value 属性必填且最终值必须非空**。列子节点 Value 是否填写取决于 MasterGo 是否提供可靠的字段/标题来源，不属于 DataGrid 加载器的必填契约。Style 只有 MasterGo 明确提供且代码库存在对应资源键时才填写。只有当 MasterGo 层级明确存在父级容器并且该父级有样式选择器时，才由父级为子控件提供样式；不得根据外观或组件名称自行添加父级容器。
- 运行时：IOName、IOCommand、PageName、IOEnable、IOState、LangName。
- ID 按 MX_GUID/Pin 规则生成，不复制 MasterGo layer ID。

# 通用转码规则（适用于所有组件和页面）

## 文本属性固定映射

```
<IOContorl ID="{id_text}" IOName="{io_name_text}" ControlType="TextBlock" IOState="{state_text}" IOEnable="{enable_text}" LangName="{lang_name_text}" Value="{text_value}" Left="{left}" Top="{top}" Width="{width}" Height="40" FontSize="{font_size}" />
```

- 独立文本节点统一映射为 `TextBlock`，不因所在组件或变体改变 ControlType。
- 如果文本是输入框、选择框等控件内部内容，则保留为所属控件内容，不额外拆分为 TextBlock。
- 文本的 Value、FontSize、Width 和坐标必须来自对应 MasterGo 节点；所有 MTSLG TextBlock 的 Height 固定为 40，不能从外层组件高度、文字 bbox 或组件语义改写。
- 独立的标题、单位、说明文字和其他文本节点，统一映射为 `ControlType="TextBlock"`；如果文字是输入框、选择框等控件内部内容，则保留为所属控件内容，不额外拆分。
- FontSize 只表示字体字号，Height 只表示控件布局边界；两者必须分别读取。所有 MTSLG TextBlock 使用固定 Height=40，禁止把外层组件高度、文字 bbox、字号或行高赋给 Height。
- 每个输出控件的 Left、Top、Width 必须来自自身 MasterGo bbox；输入框和选择框外框的 Height 按已命中的 40/36/32/28 变体处理；固定模板、相邻控件或父容器不能代替真实尺寸。
- 最终坐标统一按内容区绝对坐标计算：`Left = pageAbsX - contentOriginX`，`Top = pageAbsY - 192`。公共外壳偏移只扣除一次；父子关系只用于确认真实结构和裁剪边界。
- 组件映射文档只登记组件集、变体、ControlType 和固定结构；具体节点来源、尺寸、字体和坐标由 AI 转码规则逐节点核对。

# 页面生成总规则

1. 识别组件集及实例属性。
2. 按完整层级匹配唯一固定模板。
3. 按节点语义、顺序、坐标、尺寸、字体和间距填充字段。
4. 缺少业务字段保留空值并标记待配置；无模板则标记未映射，不静默替换。

# 转码专项规则：文本尺寸与顶部示例标题

**TextBlock 高度与字号：**FontSize 只表示字体字号，Height 只表示控件布局边界，两者必须分别读取。所有 MTSLG TextBlock（标签、数值、单位和独立文本）固定使用 `Height="40"`。输入框和选择框外框的 Height 仍按 40/36/32/28 变体处理，禁止把 FontSize、文字 bbox、外层组件高度或行高直接赋给 TextBlock Height。

**顶部示例标题：**位于页面根节点或展示外壳、仅用于组件展示/工件示教的最上方标题（例如“工件边缘示教（2.2.1.E）”）标记为 design-artifact-title，默认不生成到业务 XML。业务内容容器内部且运行时明确需要的标题才保留。

被剥离或保留的标题必须记录节点 ID 和原因，便于 XML 验证和追溯。

## 文本占位与省略门禁

- `_placeholder=true` 只表示该 TEXT 来自组件库占位来源，不能单独决定删除。
- `_placeholder=true` 且文本在当前页面中承担真实按钮文案、F 值、标签、数值、标题栏、组件内部标题或其他业务内容时，按真实可见属性生成；即使映射中保留 placeholder 标记，也必须生成。
- 页面文本只有在页面根级/工件级 `page-title`、DSL 明确标记为 hidden，或已被宿主结构边界剥离为 `host-shell` 时允许省略。省略必须在 `textAudit` 中记录 `decision=omit` 和原因。
- GroupBox Header、Tab/TabItem 标题、Table 列标题、组件内部标题不因名字包含“标题”而自动省略；它们按自身可见性和正式组件映射处理。
