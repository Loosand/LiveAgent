# LiveAgent UI 设计与代码规范

本文件覆盖 `crates/agent-ui`、桌面 GUI 和 Gateway WebUI。视觉值以 `crates/agent-ui/src/styles/tokens.css` 为准，组件实现以 `crates/agent-ui/src/components/ui` 为准。业务页面只组合它们；新增功能先查现有组件和变体。

本文件只定义设计原则、视觉规则、组件契约和验收要求。外部参考只描述设计特征，不记录产品名或仓库路径；调研过程、迁移进度与验证结果记录在独立审计文档中。

## 设计方向

界面采用中性、紧凑的工作台风格，以灰阶表面区分侧栏、画布和浮层，保持操作密度与装饰克制。

代码采用共享组件与组合式页面：Base UI 提供交互基础，CVA 定义变体，`cn()` 合并样式，Tailwind 4 消费统一的语义 tokens。桌面端与 WebUI 共用设计系统，通过应用适配器处理平台差异。

## 视觉语言

- 对话、文件、终端和任务是内容主体。侧栏、工具栏与配置页保持安静，不用彩色背景争夺注意力。
- 默认支持浅色、深色和跟随系统。主题由应用设置控制，不在组件中自行检测系统主题。
- 用相邻表面明度组织内容：侧栏 → 画布 → 卡片 → 浮层。卡片和设置组优先用底色与间距分组。
- 分割线仅用于需要明确边界的表格、编辑器和浮层。避免卡片套卡片、重复描边、渐变和大面积毛玻璃。
- 主操作使用中性反色；普通选中状态使用 `accent`。成功、警告、错误、信息和运行状态才使用状态色。
- 图标、文字和位置一起表达状态；不能仅靠红绿区分。分类图标优先中性，不把“类型”伪装成成功或失败。

## Tokens

设计尺度采用有限档位。新增差异先判断是否有可辨识的用途；相近值合并到同一档，不因单个页面的微调增加字号、灰阶、透明度、圆角或间距。语义 token 可以共享物理值，不能为了不同名称制造肉眼难以区分的新层级。

### 颜色

两端入口导入同一个 `tokens.css`。Tailwind 的 `@theme inline` 将 HSL 变量映射到语义工具类。主题色采用 HSL 通道格式，供 CSS、终端主题读取与颜色混合统一使用；不要在页面定义第二套主题格式。

| 语义 | 用法 | 深色目标 |
| --- | --- | --- |
| `sidebar` | 导航与窗口侧栏 | 与 `background` 共用 |
| `background` | 主工作区 | 近 `#181818` |
| `card` | 设置组、内容块 | 近 `#282828` |
| `popover` | Dialog、Select、Popover、Sheet | 近 `#282828` |
| `accent` | 中性选中与悬停 | 近 `#383838` |
| `surface-inset` | 编辑器/预览的凹入区域 | 与 `background` 共用 |
| `foreground` / `muted-foreground` | 正文 / 辅助文字 | 近 `#f0f0f0` / `#afafaf` |
| `primary` / `primary-foreground` | 主要操作及其文字 | 反色成对使用 |
| `border` / `input` / `ring` | 分隔 / 输入边界 / 焦点 | 分工明确，不随页面改色阶 |
| `success` / `warning` / `destructive` / `info` / `activity` | 状态 | 两套主题分别保证辨识度 |
| `overlay` | 遮罩 | `bg-overlay/40` |

使用 `bg-card text-foreground`、`text-muted-foreground`、`border-border`，不使用 `bg-zinc-900`、`text-emerald-600 dark:text-emerald-300` 这样的页面配色。

浅色表面采用白色、浅灰、选中灰三档；card / secondary / muted / sidebar 共用浅灰。深色表面采用 background、card、accent 三档；popover / secondary / muted 共用 card。边框、输入边界和文字按辨识用途独立，不能为了凑齐层级增加近似灰色。

颜色透明度只使用 `0/5/10/20/40/60/80/90/100`，不增加 `/15`、`/65` 或 `/[0.085]` 等中间档。完全不透明时省略 `/100`。hover、focus、selected 必须保留可辨识差异；合并后相同的声明应删除，需要反馈的状态应选择相邻有效档位。普通文字优先使用 foreground / muted-foreground，不靠连续透明度制造字号以外的隐性层级。

**任意颜色仅允许真正的单次用途。** 同一个颜色在前端源码出现第二处，就必须提取或复用语义 token，并迁移所有对应的任意颜色写法。统计覆盖共享 UI、桌面 GUI 和 WebUI，跨文件、组件、背景/文字/描边、hover/focus/dark 状态以及不同透明度；按源码用途计数，不按组件运行时渲染次数计数。不能分别写 `bg-[#aabbcc]`、`text-[#abc]` 或 `hover:bg-[rgb(170_187_204)]/80` 来重复定义同色。

先查共享语义 token；新增时按用途命名并集中定义，不能为每个组件复制一份相同色值。确实只出现一次的特殊颜色可以保留任意值，不需要额外审批；一旦复用就必须收敛。CSS 和行内样式中的相同字面量也计入用途统计，移动到这些位置不能绕过规则或静态外观检查。

同色判定不受十六进制大小写、简写、透明度或色彩空间写法影响。`repeated-arbitrary-color` 是强制失败项，不接受基线豁免；审阅必须同时识别自动检查未能判等的重复颜色。

状态的淡底优先使用 `Badge variant="success"` 等标准变体。确需实心状态区域时，`bg-success` 必须搭配 `text-success-foreground`；其他状态同理。不要在深色主题里给浅色状态底继续配白字。

`--chat-*`、`--chip-*`、`--tool-*` 等领域变量引用通用语义，不维护第二套基础灰阶。Git 图、ANSI、语法高亮、品牌 SVG、图片内容可使用专用色，但只由对应渲染适配器管理。

### 字号、字体与缩放

| 类 | 基准字号 | 用途 |
| --- | --- | --- |
| `text-2xs` | 10px | 辅助标记、紧凑计数，不用于正文和主要操作 |
| `text-xs` | 12px | 控件、列表、标签、时间和次要信息 |
| `text-base` | 16px | 正文、输入内容与标题 |

只定义这三个基准字号。11px 归入 12px，13px 的控件归入 12px，14/15px 的正文归入 16px；按用途选择，不通过小数或别名恢复中间值。标题与正文共用 16px，通过字重、间距和语义结构区分，不增加 18/20/22/28px 等标题档。大小名称表示有限的选项集合，不代表可以任意扩充集合。

- 中文使用系统字体栈，代码和路径用 `font-mono`，数字表格用 `tabular-nums`。尊重用户配置的界面、对话、代码字体。
- 禁止任意字号及 `text-sm/lg/xl`、caption/ui/body 等额外字号别名。Tailwind 字号命名空间仅注册上述三档；新增组件直接选择对应层级。
- `zone-font-scale` 控制侧栏、对话和工具区域；portal 由 `ZoneFontScaleContext` 传递比例，不能丢失或重复相乘。
- 行内代码和公式外层继承所在正文的字号；上下标等公式内部几何由渲染器负责。终端、编辑器的默认字号从同一 CSS 档位读取，不在配置对象中另写像素值。
- 用户缩放是在选定基准上的整体比例，不是新增设计档位。`tailwind-merge` 必须识别 `text-2xs`，且不能把字号与文字颜色互相覆盖。

### 圆角、阴影与边框

这些与颜色、字号同属强制规范。共享组件按用途选择外观；业务页面不能再为同类控件各写一套圆角、阴影或描边透明度。

| 用途 | 圆角类 | 默认值 | 标准入口 |
| --- | --- | --- | --- |
| 列表与菜单项 | `rounded-item` | 4px | SelectItem、DropdownMenuItem |
| 常规控件 | `rounded-control` | 8px | Button、Input、Textarea、SelectTrigger |
| 内容容器 | `rounded-panel` | 16px | SettingsGroup、内容分组 |
| 浮层 | `rounded-overlay` | 16px | Dialog、Sheet inset、Popover、SelectContent、菜单 |
| 主输入区域 | `rounded-composer` | 16px | Composer 外框、内部表面与拖拽遮罩 |
| 圆形与胶囊 | `rounded-full` | 完全圆角 | 状态点、Switch、圆形图标、滚动条 |

物理圆角只有 4/8/16px，对应 `rounded-sm/lg/2xl`；角色 token 复用这些值，不增加半径。圆形使用 `rounded-full`，贴边与全屏容器使用 `rounded-none`。CSS 直接引用相应变量，禁止 `border-radius: 13px`、`rounded-[7px]` 或在页面用 calc 自选偏移。

| 外观 | 用途 | 规则 |
| --- | --- | --- |
| `shadow-none` | 正文、列表、常规内容容器 | 默认平面，靠间距和底色分组 |
| `shadow-control` | 输入框、轻微抬升 | 统一 0/1/2px 几何，主题负责强度 |
| `shadow-overlay` | 菜单、Dialog、Sheet、浮动操作 | 统一 0/16/48px 几何，主题负责强度 |
| `shadow-inset` | 凹入边界、拖拽提示 | 单层内边界；避免与同一位置的 border 叠加 |
| `shadow-focus` / `focus-visible:ring-2 ring-ring` | 焦点 | 独立于抬升，不用彩色投影模拟焦点 |
| `shadow-separator` | 叠放的小徽标与背景分离 | 统一细边界，不由页面手写 shadow |

不使用默认 `shadow-sm/md/lg/xl` 自选强度，也不按页面拼接多层阴影或 `dark:shadow-[...]`。状态面板通过颜色、文字、图标和动画表达状态，不使用装饰光晕。键盘示意图通过集中定义的 `--keyboard-*` 深度状态表达键帽厚度；该几何不能用于应用卡片或浮层。

| 边界 | 工具类 / CSS token | 用途 |
| --- | --- | --- |
| 普通描边与分隔 | `border border-border` / `--border-width-default` | 1px，主题统一明暗强度 |
| 输入边界 | `border-input` | 比普通分隔更清晰；禁止页面改变透明度 |
| 选中与焦点 | `border-ring` / `ring-2 ring-ring` | 选中边界与键盘焦点，配合背景/勾选状态 |
| 强调宽度 | `border-2` / `--border-width-emphasis` | 2px，仅拖拽目标、状态线等明确场景 |
| 错误与业务状态 | `border-destructive` 或组件状态变体 | 必须配合文字或图标；状态淡描边由组件/适配器管理 |

边框的颜色、宽度、样式和显示条件都属于规范。禁止普通描边使用 `border-black/5`、`dark:border-white/10`、`border-border/60`，禁止用 foreground/primary 代替边界语义。列表分隔按方向使用 `border-b` 等；虚线只用于拖拽/导入区域或明确的占位状态。一个边界只画一次，不能用 border、ring、inset shadow 堆叠加粗。滚动条的透明 border 是命中区域留白，使用独立 `--scrollbar-gutter`，不当作可见描边。

`cn()` 必须注册扩展的 radius 和 shadow 档位，保证调用方的语义类能覆盖组件默认值，并通过回归测试验证合并行为。

### 尺寸、层级与运动

- 内容间距使用 `0/0.5/1/2/3/4/6/8`，对应 0/2/4/8/12/16/24/32px；大区块分隔使用 `12/16/24/32`。描边贴合可使用 `px`。不使用 `1.5/2.5/3.5/5/7` 等中间间距。
- 微小差异向最接近且适合用途的档位合并。安全区、拖拽坐标、图表几何、图标预留与虚拟列表尺寸属于布局约束，必须保持计算来源和相互关系，不能按视觉间距机械取整。
- 按钮高度：xs 24、sm 32、default 36、lg 40px；图标按钮采用 `icon-xs/icon-sm/icon/icon-lg`。页面不重复覆盖 `h-* w-* px-*` 伪造相同变体。
- Input / Select 高度 36px；紧凑控件需要时统一扩展组件 API，不能每个表单写一套。
- Switch 尺寸统一在组件内定义，轨道与滑块一起变化。默认 36×20、sm 28×16、lg 44×24px。
- 重复布局宽度使用 `w-settings-nav`、`max-w-settings`。虚拟列表行高、可拖拽面板限制属于布局算法，应集中到对应布局模型。
- z-index 使用共享 `layer-*`。Popover 与 Modal 共享 portal 平面，以 DOM 顺序承载嵌套交互，不能随意提高某一弹层层级。
- 普通反馈以 150ms 为基准，浮层最多 200ms；加载/进度动画可单独定义。支持 `motion-reduce:transition-none`，连续动画应提供 reduced-motion 退化。

## 组件所有权与使用

```text
agent-ui/src/styles/tokens.css        基础视觉值与 Tailwind 映射
agent-ui/src/components/ui/           标准控件和通用组合
agent-ui/src/components/<domain>/     有业务含义的组合
agent-ui/src/pages/                   页面编排与状态绑定
agent-gui / agent-gateway/web         启动、适配器、平台独有功能
```

不另建一份应用私有基础组件库。共享层也不直接依赖 Tauri 或 Gateway 的实现。

| 场景 | 标准入口 | 约束 |
| --- | --- | --- |
| 操作 | `Button` | 使用 variant 和 size；success 用于运行中追加队列，info 用于更新提示等信息操作；默认 `type="button"` |
| 纯图标操作 | `IconButton` | 必填已本地化的 `aria-label` |
| 状态 | `Badge` | `muted/success/warning/destructive/info/activity` |
| 文本 / 多行 / 数字 | `Input` / `Textarea` / `NumberInput` | 关联 Label，保留禁用、焦点与 invalid 反馈 |
| 布尔 / 多选 | `Switch` / `Checkbox` | 禁止页面手绘轨道和滑块 |
| 页面切换 / 选项组 | `Tabs` / `ToggleGroup` | 保留键盘行为，不用带 role 的 div 冒充 |
| 选项选择 | `Select` | 简单列表；复杂选择器组合 Popover。value 必须有可读标签 |
| 菜单 | `DropdownMenu` | 键盘、焦点、portal 交给 primitive |
| 普通模态 / 危险确认 | `Dialog` / `AlertDialog` | 使用 Header/Body/Footer/Actions 槽位 |
| 侧面面板 / 提示 | `Sheet` / `Popover` / `Tooltip` | 复用焦点管理与 portal 字号传递 |
| 设置分组 | `SettingsGroup` / `SettingsRow` | 页面提供内容和 control，不重写分组 chrome |
| 空状态 | `Empty` | 内容标题、说明、可选操作；加载过程不能假装空数据 |

Base UI 组合使用 `render`。不要嵌套 button。普通链接保留 `<a>` 语义，可使用 `buttonVariants()` 获取外观。应用级图标统一通过 `IconSet`，品牌资源由专用品牌组件管理。

```tsx
import { Button } from "@liveagent/ui/components/ui/button";
import { SettingsGroup, SettingsRow } from "@liveagent/ui/components/ui/settings-group";
import { Switch } from "@liveagent/ui/components/ui/switch";

<SettingsGroup title={t("settings.title")}>
  <SettingsRow
    title={t("settings.enabled")}
    control={<Switch checked={enabled} onCheckedChange={setEnabled} aria-label={t("settings.enabled")} />}
  />
</SettingsGroup>
<Button size="sm" variant="secondary" onClick={onSave}>{t("common.save")}</Button>
```

三个 `components.json` 指向同一共享组件路径，使用 Base UI 配置。添加 shadcn/ui 组件前检查公共实现与生成差异；不要用 init/overwrite 覆盖共享 tokens、IconSet 或 portal 契约。

## 最少必要类名

每个元素只声明自身需要的差异。共同样式由最近的公共父级或标准组件负责，子元素不重复声明相同值。

- 颜色、字体、字号、字重、行高和文字对齐等可继承属性，在共同作用域设置一次。向父级收敛前核对所有子元素、主题、交互状态和字号缩放，避免改变本应不同的内容。
- 标准组件通过 variant / size 提供的对齐、间距、字号、圆角和过渡，调用方不再重复。需要改变时使用组件 API，确有局部差异才写 className。
- 删除重复、冲突、始终被覆盖或没有实际作用的类名。默认值只有在需要重置样式或定义组件契约时才显式声明；响应式和状态类只有产生差异或承担重置作用时才保留。
- 等宽等高用 `size-*`，相同方向间距用 `p-*`、`px-*`、`py-*` 等简写。不要为了缩短文本改变轴向、断点、状态或覆盖顺序。
- 背景、边框、圆角、阴影、间距和布局不会自动继承；不能按文字样式的方式向父级移动。父级 opacity 与各子元素 opacity 的合成结果也不等价。
- Portal 在实际挂载容器建立主题与排版边界；独立组件在自身边界定义必要默认值，不依赖调用页面碰巧提供的样式。
- 清理前同时检查生成 CSS、自定义选择器、脚本和交互用途。`group`、`peer`、定位锚点、`min-w-0`、屏幕阅读器类及 CSS/测试钩子不能仅因没有直接视觉效果而删除。
- 不使用 `!important`、全后代选择器或把长类名搬进私有 CSS 来掩盖重复。`cn()` 负责必要的条件组合和调用方覆盖，不能替代源码中的冗余清理。

## 硬编码判定

| 类型 | 处理方式 |
| --- | --- |
| 颜色、字号、圆角、阴影、重复控件外观 | 提升为语义 token / variant，迁移调用方；真正单次用途的特殊颜色按上述例外处理 |
| 重复设置行、空状态、表单操作区 | 使用通用组件；业务组件组合它们 |
| `style={{ color: "#...", fontSize: 13 }}` 等静态外观 | 转成 token/工具类，不能把常量改个名字就算完成治理 |
| 拖拽坐标、虚拟列表 transform、进度百分比、运行时字体选择 | 允许动态 style；算法来源、单位与边界留在布局/领域模型 |
| 文件上传 `<input type="file">`、隐藏字段、contenteditable 编辑器 | 合法宿主元素；不是强行换成 Input 的对象 |
| SVG 路径、第三方终端/图表/语法高亮 palette | 由适配器集中管理，并测试主题兼容；不要污染应用主题 |
| 产品文案、模型默认值、重试次数、协议字段、快捷键 | 分别归 i18n、领域配置、协议契约；视觉调整不得改变业务含义 |
| 一次性的响应式约束或特殊几何 | 可使用有依据的任意值；重复出现后提升为布局 token |

## 规范检查

```sh
pnpm check:ui-design        # 检查新增或增加的违规项
pnpm audit:ui-design        # 输出全量分类统计
pnpm check:ui-design:strict # 检查所有违规项
pnpm prune:ui-design        # 只删除已解决基线项，绝不添加或扩大允许项
```

规范检查覆盖三个前端源码目录的 TS、TSX 和 CSS，包括原生控件、颜色、字号、静态外观、圆角、阴影及边框。共享 `tokens.css` 是视觉值的定义来源，应用样式不得覆盖共享基础 token。`decoration-class`、`decoration-css`、`decoration-token-override`、`repeated-arbitrary-color` 和 `design-scale` 禁止新增基线豁免。

颜色用途包括任意工具类、渐变、任意 CSS 属性、`@apply`、CSS 和行内值；白/黑工具类与对应字面色值也合并统计。注释和 URL 片段不作为颜色用途。自动检查不能替代 UI 语义、对比度和键盘交互的人工验收。

`scripts/ui-design-baseline.json` 是历史债务账本，不是新的设计白名单。按文件、规则、值指纹及出现次数匹配：同一文件增加同类问题、换成另一个硬编码值、把问题搬到另一个文件都会失败。不要扩大基线来让检查通过。修复后使用 prune 缩小账本。

## 组件样板与验收

运行 Vite 开发命令后打开 `/design.html`：桌面 `pnpm --filter liveagent dev`，WebUI `pnpm --filter @liveagent/gateway-webui dev`。样板使用真实公共组件，展示两种主题、按钮状态、表单、开关、字号缩放、嵌套 Select/Dialog 和空状态；「圆角、阴影与边框」页展示角色圆角、抬升层级、正常/错误/焦点边界。它不读取业务配置、不调用模型或后端，不是生产构建入口。

视觉变更按影响范围验证：

1. GUI / WebUI TypeScript 与构建；共享组件与边界检查。
2. 相关组件和业务回归测试。断言应验证语义契约与交互行为，避免固定页面私有色阶或像素值。
3. 浏览器验证浅色/深色、紧凑窗口、90%/120% 字号、禁用/错误、Tab 焦点、Esc 关闭、嵌套浮层和焦点返回。
4. 对话滚动、编辑器、虚拟列表和桌面原生交互涉及布局算法时，必须验证相应运行环境；静态样板不能替代这些验证。
