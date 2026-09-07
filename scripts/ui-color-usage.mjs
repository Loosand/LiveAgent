// Compare base colors across utilities and states. Opacity belongs to the use
// site; changing it must not make a repeated base color appear unique.
export function normalizeLiteralColor(literal) {
  const value = literal.replaceAll("_", " ").trim().toLowerCase();
  if (/^#[\da-f]{3,4}$/.test(value)) {
    return `#${[...value.slice(1, 4)].map((digit) => digit.repeat(2)).join("")}`;
  }
  if (/^#[\da-f]{6}(?:[\da-f]{2})?$/.test(value)) return value.slice(0, 7);
  const match = value.match(/^(rgba?|hsla?|oklch|oklab|lab|lch|color)\((.*)\)$/);
  if (!match || /var\(|calc\(|\bfrom\b/.test(match[2])) return undefined;
  const parts = match[2].split("/")[0].replaceAll(",", " ").trim().split(/\s+/);
  const hex = (channels) => `#${channels.map((channel) => Math.round(Math.max(0, Math.min(255, channel))).toString(16).padStart(2, "0")).join("")}`;
  if (/^rgba?$/.test(match[1]) && parts.length >= 3) {
    const channels = parts.slice(0, 3).map((part) => Number.parseFloat(part) * (part.endsWith("%") ? 255 / 100 : 1));
    return channels.every(Number.isFinite) ? hex(channels) : undefined;
  }
  if (/^hsla?$/.test(match[1]) && parts.length >= 3) {
    const unit = parts[0].match(/(?:deg|turn|grad|rad)$/)?.[0];
    const degrees = Number.parseFloat(parts[0]) * ({ turn: 360, grad: 0.9, rad: 180 / Math.PI }[unit] ?? 1);
    const hue = ((degrees % 360) + 360) % 360 / 60;
    const saturation = Number.parseFloat(parts[1]) / 100;
    const lightness = Number.parseFloat(parts[2]) / 100;
    if (![hue, saturation, lightness].every(Number.isFinite)) return undefined;
    const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
    const x = chroma * (1 - Math.abs(hue % 2 - 1));
    const channels = [[chroma, x, 0], [x, chroma, 0], [0, chroma, x], [0, x, chroma], [x, 0, chroma], [chroma, 0, x]][Math.floor(hue)];
    return hex(channels.map((channel) => (channel + lightness - chroma / 2) * 255));
  }
  // Other CSS color spaces retain their space and channel notation. Do not
  // claim that an arbitrary color-space conversion is equivalent to sRGB.
  return `${match[1]}(${parts.join(" ")})`;
}

export function collectArbitraryColorUsages(text, file, startLine = 1) {
  const usages = [];
  // Includes gradients, directional borders and arbitrary CSS properties.
  const utility = /\b(?:bg|text|border(?:-[trblxyse])?|ring(?:-offset)?|outline|fill|stroke|shadow|decoration|from|via|to|accent|caret)-\[([^\]\n]+)\]|\[(?:background(?:-color)?|color|border(?:-[a-z-]+)?|fill|stroke|box-shadow):([^\]\n]+)\]/g;
  for (const match of text.matchAll(utility)) {
    const body = (match[1] ?? match[2]).replaceAll("_", " ").replace(/url\([^)]*\)/gi, "");
    for (const color of literalColors(body)) usages.push({ arbitrary: true, file, color, value: match[0], line: startLine + text.slice(0, match.index).split("\n").length - 1 });
  }
  return usages;
}

export function collectNeutralUtilityUsages(text, file, startLine = 1) {
  return [...text.matchAll(/\b(?:bg|text|border(?:-[trblxyse])?|ring(?:-offset)?|outline|fill|stroke|shadow|decoration|from|via|to|accent|caret)-(white|black)\b/g)].map((match) => ({
    file, color: match[1] === "white" ? "#ffffff" : "#000000",
    line: startLine + text.slice(0, match.index).split("\n").length - 1,
  }));
}

export function literalColors(value) {
  const colors = new Set();
  for (const literal of value.replace(/url\([^)]*\)/gi, "").matchAll(/#[\da-f]{3,8}\b|(?:rgba?|hsla?|oklch|oklab|lab|lch|color)\([^()]*\)/gi)) {
    const color = normalizeLiteralColor(literal[0]);
    if (color) colors.add(color);
  }
  return colors;
}

export function collectStyleColorUsages(css, file, startLine = 1) {
  const usages = [];
  const declarations = /(?:^|[;{])\s*(?:--[\w-]+|color|background(?:-[a-z-]+)?|border(?:-[a-z-]+)?|outline(?:-[a-z-]+)?|fill|stroke|box-shadow|text-shadow)\s*:\s*([^;{}]+)(?=[;}])/g;
  for (const match of css.matchAll(declarations)) {
    for (const color of literalColors(match[1])) usages.push({ file, color, line: startLine + css.slice(0, match.index).split("\n").length - 1 });
  }
  return usages;
}
