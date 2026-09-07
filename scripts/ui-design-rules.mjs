import { createHash } from "node:crypto";
import { parse } from "@babel/parser";
import { collectArbitraryColorUsages, collectNeutralUtilityUsages, collectStyleColorUsages, literalColors, normalizeLiteralColor } from "./ui-color-usage.mjs";

export const ruleDescriptions = {
  "literal-neutral": "固定黑白色需区分应用表面与媒体遮罩，使用语义 token",
  "palette-color": "使用语义颜色 token，不在视图选择色阶",
  "arbitrary-type": "使用命名字号，不在视图定义 px/rem/em 字号",
  "arbitrary-visual": "将重复的圆角、阴影和颜色提升为 token 或组件 variant",
  "native-control": "复用 components/ui 控件；文件选择与隐藏字段除外",
  "static-inline-style": "静态外观使用 token/variant；运行时几何单独保留",
  "css-visual-literal": "CSS 外观值集中到 tokens.css；第三方渲染适配另行记录",
  "decoration-class": "圆角、阴影、描边使用约定的 token，禁止页面自选阴影与中性描边透明度",
  "decoration-css": "CSS/内嵌样式的圆角、阴影、边框几何集中到 tokens.css",
  "decoration-token-override": "基础圆角、阴影、边框与焦点 token 只能由 tokens.css 定义",
  "repeated-arbitrary-color": "同色在源码出现第二处时必须提取语义 token，不允许任意颜色或基线豁免",
  "design-scale": "字号、间距、圆角和颜色透明度只使用约定尺度，不允许新增中间档位",
};

const palette = /\b(?:text|bg|border|ring|fill|stroke|decoration|from|via|to|shadow)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d+\b/g;
const typography = /\btext-\[(?:calc\()?\d[^\]]*(?:px|rem|em)[^\]]*\]/g;
const appearance = /\b(?:rounded(?:-[trblse]{1,2})?|shadow|bg|text|border|ring)-\[(?:#[\da-fA-F]|(?:rgb|hsl|oklch|color-mix)\(|\d)[^\]]*\]/g;
const staticAppearance = /^(?:color|background(?:Color|Image)?|border\w*|outline\w*|boxShadow|font(?:Size|Family|Weight)|lineHeight|letterSpacing|padding\w*|margin\w*)$/;
const ownedDecorationToken = /^--(?:radius(?:-[\w-]+)?|corner-[\w-]+|elevation-[\w-]+|border-width-[\w-]+|border|input|ring)$/;

export function scanDesignSource(source, file, colorUsages = []) {
  const issues = [];
  const add = (rule, value, line = 1) => {
    const normalized = value.replace(/\s+/g, " ").trim();
    issues.push({ file, rule, value: normalized, line,
      fingerprint: createHash("sha256").update(`${rule}:${normalized}`).digest("hex").slice(0, 16) });
  };
  function classes(text, line) {
    for (const match of text.matchAll(/\b(?:text|--text)-(?:micro|caption|ui|body|title|heading|sm|lg|xl|[2-9]xl)\b|\brounded(?:-[trblse]{1,2})?-(?:xs|md|xl|3xl|4xl)\b/g)) add("design-scale", match[0], line);
    for (const match of text.matchAll(/\b(?:[mp][xytrblse]?|gap(?:-[xy])?|space-[xy])-(\d+(?:\.\d+)?)(?![\w.])/g)) {
      const value = Number(match[1]);
      if (value <= 32 && ![0, 0.5, 1, 2, 3, 4, 6, 8, 12, 16, 24, 32].includes(value)) add("design-scale", match[0], line);
    }
    for (const match of text.matchAll(/\b(?:text|bg|border(?:-[trblxyse])?|ring|outline|fill|stroke|from|via|to|decoration)-(?:foreground|(?:card|popover|muted|accent|primary|secondary|success|info|warning|destructive|activity|sidebar|ring)(?:-foreground)?|background|border|input|surface-inset|overlay|chip(?:-hover)?|send-disabled|window-close(?:-foreground)?|white|black)\/(\d+|\[0?\.\d+\])(?![\w.])/g)) {
      const value = match[1].startsWith("[") ? Number(match[1].slice(1, -1)) * 100 : Number(match[1]);
      if (match[1].startsWith("[") || ![0, 5, 10, 20, 40, 60, 80, 90, 100].includes(value)) add("design-scale", match[0], line);
    }
    colorUsages.push(...collectArbitraryColorUsages(text, file, line));
    colorUsages.push(...collectNeutralUtilityUsages(text, file, line));
    for (const match of text.matchAll(/\b(?:rounded(?:-[trblse]{1,2})?|(?:inset-|drop-)?shadow|border(?:-[trblxyse])?)-\[[^\]]+\]|\bshadow-(?:xs|sm|md|lg|xl|2xl|inner)\b|\bborder-(?:black|white|foreground|muted-foreground|primary)(?:\/\[[^\]]+\]|\/\d+)?|\bborder-border\/(?:\[[^\]]+\]|\d+)/g)) {
      if (/^border(?:-[trblxyse])?-\[/.test(match[0]) && collectArbitraryColorUsages(match[0], file, line).length) continue;
      add("decoration-class", match[0], line);
    }
    for (const match of text.matchAll(/\b(?:text|bg|border|ring|fill|stroke|shadow)-(?:white|black)\b/g)) add("literal-neutral", match[0], line);
    for (const match of text.matchAll(palette)) add("palette-color", match[0], line);
    for (const match of text.matchAll(typography)) add("arbitrary-type", match[0], line);
    for (const match of text.matchAll(appearance)) {
      // A truly single-use color is permitted. Reuse is checked across files
      // after the entire source inventory has been scanned.
      if (collectArbitraryColorUsages(match[0], file, line).length) continue;
      if (!/^text-\[.*(?:px|rem|em)/.test(match[0])) add("arbitrary-visual", match[0], line);
    }
  }
  function decorations(css, startLine = 1) {
    // Declaration boundaries, rather than individual lines, cover compact and multiline CSS.
    // Only decoration is checked here; other legacy CSS rules retain their existing ledger.
    const clean = css.replace(/\/\*[\s\S]*?\*\//g, (text) => text.replace(/[^\n]/g, " "));
    colorUsages.push(...collectStyleColorUsages(clean, file, startLine));
    for (const match of clean.matchAll(/(?:^|[;{])\s*(--[\w-]+)\s*:\s*([^;{}]+)(?=[;}])/g)) {
      if (ownedDecorationToken.test(match[1])) add("decoration-token-override", `${match[1]}: ${match[2].trim()}`, startLine + clean.slice(0, match.index).split("\n").length - 1);
    }
    const declarations = /(?:^|[;{])\s*((?:border(?:-[a-z-]+)?|box-shadow|outline(?:-[a-z-]+)?))\s*:\s*([^;{}]+)(?=[;}])/g;
    for (const match of clean.matchAll(declarations)) {
      const property = match[1];
      const value = match[2].trim();
      const keyword = /^(?:0|none|inherit|initial|unset|transparent|currentColor|solid|dashed|dotted|hidden)$/.test(value);
      const shadow = property === "box-shadow";
      const literal = /#[\da-f]{3,8}\b|(?:rgb|hsl|oklch)\(\s*\d|(?<![\w-])\d*\.?\d+(?:px|rem|em|%)(?=$|[\s/,)])/i.test(value);
      if (!keyword && (literal || (shadow && !/^var\(--[\w-]+\)(?:,\s*var\(--[\w-]+\))*$/.test(value)))) {
        add("decoration-css", `${property}: ${value}`, startLine + clean.slice(0, match.index).split("\n").length - 1);
      }
    }
  }
  if (file.endsWith(".css")) {
    // Preserve line numbers while ignoring comments.
    const css = source.replace(/\/\*[\s\S]*?\*\//g, (text) => text.replace(/[^\n]/g, " "));
    decorations(css);
    for (const [index, line] of css.split("\n").entries()) {
      classes(line, index + 1);
      const declaration = line.match(/^\s*((?:background|color|border(?:-color|-radius)?|box-shadow|font-size|font-family|line-height|letter-spacing)):\s*(.+);/);
      if (declaration && /#[\da-f]{3,8}\b|(?:rgb|hsl|oklch)\(\s*\d|\b\d*\.?\d+(?:px|rem|em)\b/i.test(declaration[2])) {
        add("css-visual-literal", `${declaration[1]}: ${declaration[2]}`, index + 1);
      }
    }
    return issues;
  }
  const ast = parse(source, { sourceType: "module", plugins: ["typescript", "jsx"] });
  const primitive = file.includes("/components/ui/");
  function stringValue(value, line) {
    classes(value, line);
    decorations(value, line);
    // Count matching CSS/inline/renderer values as additional uses, even if
    // only one of the occurrences is written as a Tailwind arbitrary color.
    if (normalizeLiteralColor(value) || /^(?:linear|radial|conic)-gradient\(/.test(value)) {
      for (const color of literalColors(value)) colorUsages.push({ file, color, line });
    }
  }
  function visit(node) {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) { for (const item of node) visit(item); return; }
    if (node.type === "StringLiteral") {
      stringValue(node.value, node.loc?.start.line);
    }
    if (node.type === "TemplateElement") {
      stringValue(node.value.raw, node.loc?.start.line);
    }
    if (node.type === "JSXOpeningElement" && !primitive && node.name.type === "JSXIdentifier") {
      const tag = node.name.name;
      if (["button", "input", "select", "textarea"].includes(tag)) {
        const type = node.attributes.find((attr) => attr.name?.name === "type")?.value?.value;
        if (!(tag === "input" && ["file", "hidden"].includes(type))) {
          add("native-control", `<${tag}${type ? ` type="${type}"` : ""}>`, node.loc.start.line);
        }
      }
    }
    // Include extracted style objects and TS assertions, not just style={{...}}.
    if (node.type === "ObjectProperty") {
      const key = node.key?.name ?? node.key?.value;
      const value = node.value;
      if (ownedDecorationToken.test(key)) add("decoration-token-override", key, node.loc.start.line);
      if (staticAppearance.test(key) && ["StringLiteral", "NumericLiteral"].includes(value?.type)) {
        const literal = String(value.value);
        const semantic = literal.includes("var(--") || /^(?:text|bg|border|ring)(?:-|\s)/.test(literal);
        const keyword = /^(?:none|normal|inherit|initial|unset|auto|transparent|currentColor|0)$/.test(literal);
        if (!semantic && !keyword) add("static-inline-style", `${key}: ${value.value}`, node.loc.start.line);
      }
    }
    for (const [key, value] of Object.entries(node)) {
      if (!["loc", "start", "end", "comments", "tokens", "extra"].includes(key)) visit(value);
    }
  }
  visit(ast.program);
  return issues;
}

export function scanDesignSources(sources) {
  const colors = [];
  const issues = sources.flatMap(({ source, file }) => scanDesignSource(source, file, colors));
  const counts = new Map();
  for (const usage of colors) counts.set(usage.color, (counts.get(usage.color) ?? 0) + 1);
  for (const usage of colors) {
    if (!usage.arbitrary || counts.get(usage.color) < 2) continue;
    const rule = "repeated-arbitrary-color";
    const value = `${usage.value} (${usage.color})`;
    issues.push({ file: usage.file, line: usage.line, rule, value,
      fingerprint: createHash("sha256").update(`${rule}:${value}`).digest("hex").slice(0, 16) });
  }
  return issues;
}

export function summarizeIssues(issues) {
  const ledger = {};
  for (const issue of issues) {
    const key = `${issue.file}:${issue.rule}:${issue.fingerprint}`;
    ledger[key] = (ledger[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(ledger).sort(([a], [b]) => a.localeCompare(b)));
}

export function compareBaseline(issues, baseline) {
  const counts = summarizeIssues(issues);
  return {
    added: Object.entries(counts).filter(([key, count]) => /:(?:repeated-arbitrary-color|design-scale):/.test(key) || count > (baseline[key] ?? 0)),
    resolved: Object.entries(baseline).filter(([key, count]) => count > (counts[key] ?? 0)),
  };
}
