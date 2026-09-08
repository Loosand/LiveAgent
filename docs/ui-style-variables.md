# UI 样式变量

这一步只集中管理现有样式值，不重新设计界面。桌面 GUI 和 Gateway WebUI
都通过共享 `base.css` 引入 `crates/agent-ui/src/styles/tokens.css`。

## Tailwind v4 用法

使用 CSS 中的 `@theme` 注册工具类，不使用 `tailwind.config.js`。
两端入口用 `@plugin` 加载 typography，用 `@source` 声明依赖包的扫描范围，
用 `@custom-variant dark` 保留原来的暗色选择器。

```css
@theme {
  --spacing: 0.25rem;
  --spacing-18px: 18px;
  --text-14px: 14px;
}
```

```tsx
<div className="py-2 gap-3 text-xs">标准 Tailwind 尺度</div>
<div className="py-1px h-18px text-14px">保留原来的特殊尺寸</div>
```

`py-2` 等标准工具类继续通过 `--spacing` 管理；已有的 Tailwind 默认色板、
字号和其他尺度直接使用 Tailwind 提供的变量。特殊值才新增代号，
例如 `text-11p5px` 对应 `11.5px`，不把不同值近似成同一档。
像素字号没有附加默认行高，以保留原来 `text-[14px]` 的行为。

原本随区域字号缩放的文本使用 `text-scaled-14px`。这类表达式在
`@theme inline` 中引用 `--zone-font-scale`，在实际元素上计算，保留弹窗和
聊天区域的字号设置。安全区、转录宽度、弹窗尺寸也采用具名表达式。

普通 CSS 和内联样式可以引用同一组变量，例如 `var(--spacing-18px)`。
颜色、阴影、圆角、行高和动画时长保留原数值；亮暗主题的原始颜色通道也在
共享文件中。既有语义颜色映射通过 `@reference` 引入 `semantic-colors.css`，保持旧配置
只展开映射、不额外导出颜色变量的行为。

响应式条件、比例、零值、SVG 路径及运行时测量和布局计算保持原样。
`@media` 条件不能直接使用 CSS 自定义属性。此次不改交互逻辑或组件结构。

新增尺寸类时同步检查 `cn()` 的类名合并：字号不能被识别成颜色，阴影大小
不能被识别成阴影颜色。`style-theme.test.mjs` 覆盖 CSS 编译和这些覆盖关系。

## 单处使用的样式

仅在一个标签消费的布局、字号、颜色和动画类，直接写成该标签的 Tailwind
工具类。保留数值和原有条件，例如 `text-14px`、`animate-mention-popup-enter`
和 `motion-reduce:animate-none!`。特殊动画、阴影、网格表达式仍在 `@theme inline`
集中管理，关键帧保留在原 CSS 中。

共享组件里的 `web:` 只匹配 Gateway 的 HTML 标记，`desktop:` 匹配桌面环境。
`max-820:` 等变体保留原 CSS 的 `max-width: 820px`（包括边界），按断点从大到小
注册；它们不替换已有的标准 Tailwind 响应式类。

迁移时检查 CSS 层叠：原来未分层的规则可能覆盖组件工具类，改写后需保留同样
的优先级。少数 `!` 用于继续覆盖仍存在的全局按钮样式或共享组件默认样式。
多处消费的类、脚本定位类、第三方生成内容、跨元素规则和复杂绘制继续保留 CSS。

## 等价值和非 CSS 调用方

动画时长只使用毫秒 token，例如 `--ui-duration-120ms`；`0.12s` 和 `120ms`
不再分别维护。完全相同的颜色原语共用一个值，阴影、渐变和 API 调色板引用它。
不同语义角色仍可以有名称，但值通过引用共用原语；不把相近颜色或 px/rem 近似合并。

动画曲线通过 `--ease-*` 管理，标签使用 `ease-ui-enter` 等具名类。
Web Animations 的 `easing` 和 xterm 的颜色解析器不接受 CSS 变量表达式，
调用前必须通过 `getComputedStyle` 取得实际值。终端透明边线保留八位十六进制值。

`touch-primary:` 保留原来的 `(hover: none), (pointer: coarse)` 条件；
它与 `no-hover:` 的 `any-hover: none` 含义不同，分别服务原有的触屏行为。
