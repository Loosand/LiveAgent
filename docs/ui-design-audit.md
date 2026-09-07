# UI 审计与迁移记录

日期：2026-09-07。规范入口：[design.md](../design.md)。范围：`agent-ui`、`agent-gui/src`、`agent-gateway/web/src` 的 TS、TSX、CSS。

## 检查器范围

颜色重复检查将十六进制大小写/简写、RGB/HSL 归一到 8 位 RGB，并忽略透明度；其他 CSS 色彩空间仅归一写法与透明度，不进行跨色彩空间换算，需由审阅补充识别。仅出现于旧 CSS 的颜色债务由原有规则追踪，不能将“重复任意颜色为零”理解为全部 CSS 颜色已迁移。

## 本轮结果

- 主题值从 base.css 和两份 Tailwind 配置收敛到共享 tokens.css；保留两端架构与用户主题设置。
- 建立中性灰表面层级，以及 success / warning / destructive / info / activity 语义；修正实心背景前景色、通知浮层、Git 提示等需要人工判断的配对。
- 收敛约 810 处散落的像素字号，取消页面自行挑选 Tailwind 色阶；后续在类型为 `.ts` 的展示配置中继续收敛色阶。
- 标准化 Button 的尺寸变体、IconButton、Badge 状态、输入焦点/invalid、Switch、SettingsGroup/SettingsRow、Empty。资源/分享/供应商/Skills 设置开关接入同一个 Switch。
- 设置 shell 使用公共 Button/Input/Empty；Dialog、AlertDialog、Sheet 使用统一浮层表面。组件样板由两端 `/design.html` 访问。
- 新增 AST/CSS 审计、只减不增的历史基线和 CI 入口。普通检查通过表示没有新增债务，**不表示历史问题已经清零**。

## 全量计数

同一检查器比较本轮开始时的 HEAD 与当前工作区；数字是规则匹配次数，不是组件数或缺陷数。tokens.css 和生成类型不属于视图扫描范围。

| 检查项 | 开始时 | 当前 |
| --- | ---: | ---: |
| 显式 Tailwind 色阶 | 1408 | 0 |
| 任意字号 | 814 | 0 |
| 基础层外原生控件 | 378 | 367 |
| CSS 外观字面量 | 332 | 76 |
| 任意圆角/阴影/颜色类 | 92 | 29 |
| 静态外观对象 | 8 | 3 |
| 固定黑白工具类 | 297 | 170 |

Markdown/Streamdown 行内代码与公式外层现已继承所在正文的字号，任意字号存量为零。终端和编辑器的默认字号读取共享 CSS 档位；剩余静态外观对象来自渲染适配配置，不能与普通页面样式不加区分地替换。

圆角、阴影和中性边框按补充规范迁移完成；剩余任意外观类主要是背景/文字颜色。固定黑白色和 CSS 适配规则尚未全量替换。它们包括媒体遮罩、第三方样式和历史毛玻璃界面。原生控件里也包含有特定键盘与拖拽语义的复杂行，必须逐场景迁移，不能仅给原生 button 换一个组件名后仍保留整段私有外观。

颜色规则补充后，单次用途的字面颜色由跨文件重复规则判断，不再算作普通任意外观债务；剩余任意外观包含语义变量引用等历史写法。因此这部分计数下降同时包含迁移与分类修正，不等同于全部都是删除的硬编码。

## 后续迁移顺序

1. Gateway 登录与状态页：将单独 CSS 主题、按钮、输入框接入共享 primitives，补齐两种主题状态。
2. 对话附件、图片预览和通知：区分媒体黑底/白字与应用表面，统一遮罩、卡片、关闭按钮。
3. Composer、Clarify、模型选择器：把复杂选择语义与视觉实现分离，保留焦点、方向键、输入法和编辑行为。
4. 项目工具、Git、文件树和窗口 chrome：迁移通用操作控件；保留真实几何、终端 palette、原生标题栏边界。

每完成一个场景，运行相关测试和浏览器验证，再使用 `pnpm prune:ui-design` 缩小基线。不要扩大基线掩盖新问题。

当前匹配最多的文件（完整列表：`pnpm audit:ui-design` 或 `node scripts/check-ui-design.mjs --json`）：

| 文件 | 匹配数 |
| --- | ---: |
| `crates/agent-gateway/web/src/styles/login.css` | 48 |
| `crates/agent-ui/src/components/chat/UserAttachmentCards.tsx` | 28 |
| `crates/agent-ui/src/components/chat/clarify/ClarifyPanel.tsx` | 24 |
| `crates/agent-gateway/web/src/styles/status-board.css` | 16 |
| `crates/agent-ui/src/components/chat/assistant-bubble/ToolResultDisplay.tsx` | 19 |
| `crates/agent-ui/src/components/workspace-editor/WorkspaceFilePreviewOverlay.tsx` | 18 |
| `crates/agent-ui/src/pages/chat/ChatComposerBar.tsx` | 18 |
| `crates/agent-ui/src/components/chat/ComposerAttachmentCard.tsx` | 17 |
| `crates/agent-ui/src/components/chat/FileDropOverlay.tsx` | 17 |
| `crates/agent-ui/src/components/workspace-editor/WorkspaceSftpPanel.tsx` | 14 |
| `crates/agent-ui/src/components/chat/ComposerModelControls.tsx` | 13 |
| `crates/agent-gui/src/components/WindowsTitleBar.tsx` | 11 |

## 验证记录

已通过：GUI 3,044 项前端测试、WebUI 714 项测试、16 项脚本测试、两端 TypeScript/Vite 生产构建、共享 UI 边界检查和无新增设计债务检查。GUI 构建仍有已有的大包体积警告。末次追加队列按钮 variant 与键盘字号收敛后，两端 TypeScript 和 17 项相关/规则测试再次通过。浏览器已检查两端组件样板，包含浅色/深色、390px 窗口无横向溢出、共享 Switch、120% 字号（caption 11 → 13.2px）、Dialog 嵌套 Select 与 Esc 关闭。样板验证不等同于所有聊天、拖拽、编辑器及 Tauri 原生交互均已端到端测试。


## 圆角、阴影与边框补充治理

本次补充以此前工作区为起点，使用新增规则独立统计（不是上表 HEAD 比较）：

| 检查项 | 补充前 | 补充后 |
| --- | ---: | ---: |
| 任意/默认阴影、任意圆角、中性描边透明度等类名 | 880 | 0 |
| CSS 与 TS 内嵌样式的圆角、阴影、边框几何 | 180 | 0 |
| 应用覆盖共享焦点 token | 2 | 0 |

- 圆角分为 item/control/panel/overlay/composer/full；标准组件与 Composer 使用角色 token，现有内容几何仍可使用共享半径尺度。
- 收敛菜单、弹窗、通知、聊天卡片、设置、工具面板、登录和状态面板的投影。状态面板去除装饰光晕；键盘示意图保留集中管理的几何厚度。
- 中性描边统一为 border-border / border-input，选中使用 border-ring；保留勾选、背景、文字等状态线索。移除 WebUI 全局输入焦点抑制及两处私有 ring 覆盖。
- 检查器新增多行/紧凑 CSS、内嵌模板、负偏移/inset 阴影、方向边框/四角圆角和基础 token 所有权检测。新增三类规则零存量，未新增基线豁免；总存量从 946 减到 677。
- 样板新增「圆角、阴影与边框」页。浏览器核对实际 6/8/14/18px 圆角、主题阴影、输入焦点、390px 无横向溢出，并核对真实 WebUI 设置页的焦点环。

补充验证：两端 TypeScript/Vite 构建、共享 UI 类型检查、WebUI 714 项测试通过。GUI 全量运行 3,045 项，其中 4 项旧外观断言需更新；保留选中/折叠/布局意图并修改断言后，涵盖失败文件、token 合并与规则的 67 项回归全部通过。此后仅追加焦点 token 防覆盖规则并移除两处覆盖，单独复测规则；没有将未重跑的整套 GUI 测试声称为最终全量通过。更早的全量通过记录保留在上节。

## 重复任意颜色补充治理

用户补充要求：除真正单次用途外，不允许 `bg-[#...]` 等任意颜色写法。新增 `repeated-arbitrary-color` 跨文件规则，重复任意颜色匹配从 12 处降为 0；该规则即使写入历史基线也会失败。

- 更新提示改用公共 Button 的 info 变体，由主题提供背景、文字、悬停与按下状态。
- Windows 关闭按钮的悬停和键盘焦点共用 window-close token，保留原有系统红色。
- 导航浮层和 Hub 渐变改用 popover / background / card 语义色，保留透明度和布局。
- 检查覆盖 TS/TSX 字符串与模板、CSS、渐变和任意 CSS 属性；RGB/HSL/十六进制及不同透明度统一统计。CSS/行内值、白黑工具类也参与判断任意颜色是否唯一。其他色彩空间换算的限制见本文「检查器范围」。
- 总历史存量为 662；此次未将旧 CSS、媒体颜色和复杂原生控件全部迁移。任意颜色分类调整与基线缩减均只减少既有允许项。

验证：25 项脚本测试（含 13 项设计规则测试）、19 项更新/导航布局/token 合并回归、两端 TypeScript/Vite 生产构建、共享 UI 类型与边界检查、7 个改动文件的 Biome 检查通过。浏览器核对两端样板浅色/深色下 info 按钮的实际前景/背景，以及悬停和 390px 窄屏无横向溢出；未出现页面异常。Windows 关闭颜色已核对生成 CSS，本轮未在 Windows 原生窗口验证交互。GUI 保留已有大包警告。

## 类名精简

- 移除聊天删除提示、Diff 计数、联网搜索、重试操作、Git 历史和 SFTP 拖拽提示中可直接继承的字号或颜色；状态差异继续在对应元素声明。
- 设置导航与返回按钮移除 Button 已提供的对齐、间距、字重和过渡声明；复制按钮去除重复 shrink，等宽等高合并为 size，Sheet 关闭按钮使用 icon-sm 变体。
- Dialog、AlertDialog 和 Sheet 标题继承浮层前景色；弹窗操作区移除无须重置的默认 flex-row，保留窄屏反向排列。
- 规范增加「最少必要类名」，区分可继承属性、组件默认值、必要的响应式重置、Portal 边界及 CSS/交互钩子。没有以全局后代选择器或私有 CSS 隐藏类名。

24 项相关回归、两端 TypeScript/Vite 构建通过。11 个变更组件通过 Biome 检查。浏览器对 7 类继承场景在浅色/深色、90%/100%/120% 字号下进行 42 组前后计算样式对比，均一致；真实 Dialog 样板核对标题继承、桌面/窄屏操作区方向、无横向溢出和 Esc 关闭。历史账本缩减至 660；本次精简不代表全仓库所有类名都已达到最少。


## 设计尺度收敛

- 基准字号只保留 10/12/16px，分别使用 text-2xs、text-xs、text-base。移除多余的字号别名和默认中间档；标题通过字重、间距和结构区分。行内代码与公式外层继承正文，终端和编辑器从共享档位读取初始字号。
- 物理圆角收敛为 4/8/16px。列表项使用 4px，控件 8px，容器、浮层和输入区共用 16px；圆形和贴边布局保留 full/none。
- 合并 1.5/2.5/3.5/5 等中间间距；普通 CSS 间距也使用共享 spacing 单位。安全区、虚拟列表、键盘示意图和拖拽计算保留几何约束；负外边距与扩展宽度公式一起调整。
- 浅色、深色表面分别收敛为三档，语义名称复用物理值。颜色工具类透明度收敛到九档，覆盖状态色、前景色、边框色和遮罩；合并后重新区分选中、悬停与焦点，去除组件变体中的重复字号与圆角。
- 新增 design-scale 强制规则，覆盖 JSX、字符串变体和 CSS @apply 中的字号、圆角、间距和颜色透明度；即使写入历史基线也会失败。CSS 任意字面值继续由原有规则追踪，图表与第三方渲染几何需要语义审阅。
- 本轮开始时历史存量 660，当前 645。任意字号、中间尺度和重复任意颜色均为零；剩余控件与 CSS 适配债务仍见上表，不代表全仓库零硬编码。

回归记录：GUI 全量运行 3,045 项，其中 20 项失败；WebUI 全量运行 714 项，其中 1 项失败。失败均源于固定旧字号、圆角、间距或透明度的样式断言；保持原交互与布局意图更新后，覆盖全部失败文件和 token 合并的 107 项回归通过。设计规则与工作区脚本共 27 项通过。没有将未重跑的最终整套 GUI/WebUI 测试记为全量通过。
