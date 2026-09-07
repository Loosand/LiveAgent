import assert from "node:assert/strict";
import test from "node:test";
import { scanDesignSource, scanDesignSources, summarizeIssues, compareBaseline } from "./ui-design-rules.mjs";
import { normalizeLiteralColor } from "./ui-color-usage.mjs";
const path = "crates/agent-ui/src/pages/example.tsx";

test("detects raw UI controls and hardcoded classes in JSX and templates, ignoring comments", () => {
  const issues = scanDesignSource('// bg-red-500\nconst A = () => <button className={`bg-red-500 text-[11px] ${active ? "rounded-[7px]" : "text-success"}`} />;', path);
  assert.deepEqual(issues.map((i) => i.rule).sort(), ["arbitrary-type", "arbitrary-visual", "decoration-class", "native-control", "palette-color"]);
});
test("permits primitives, hidden/file fields, semantic tokens and runtime geometry", () => {
  const source = 'const A = () => <><input type="file" /><input type="hidden" /><Button className="text-xs bg-success/10" style={{ transform: `translateX(${x}px)`, width, color: "hsl(var(--success))" }} /></>;';
  assert.deepEqual(scanDesignSource(source, path), []);
  assert.deepEqual(scanDesignSource('const A = () => <button />;', path.replace("pages/example", "components/ui/button")), []);
});
test("static inline appearances and CSS literals are inspected", () => {
  assert.equal(scanDesignSource('const A = () => <div style={{ color: "#ff0000", fontSize: 13, width: size }} />;', path).length, 2);
  assert.equal(scanDesignSource('/* color: #fff; */\n.a {\n color: #fff;\n font-size: 13px;\n background: hsl(var(--card));\n}', 'styles/example.css').length, 2);
});
test("baseline rejects new literals, moved violations and increased occurrences", () => {
  const original = scanDesignSource('const A = () => <button className="text-[11px]" />;', path);
  const baseline = summarizeIssues(original);
  assert.equal(compareBaseline(original, baseline).added.length, 0);
  assert.ok(compareBaseline([...original, ...original], baseline).added.length > 0);
  assert.ok(compareBaseline(scanDesignSource('const A = () => <button className="text-[9px]" />;', path), baseline).added.length > 0);
  assert.ok(compareBaseline(scanDesignSource('const A = () => <button />;', path + 'x'), baseline).added.length > 0);
  assert.equal(compareBaseline([], baseline).resolved.length, 2);
});

test("decoration checks cover negative/inset shadows, directional corners and border alpha", () => {
  const issues = scanDesignSource('const A = <div className="shadow-[-18px_0_45px_#000] dark:shadow-[inset_0_1px_0_white] rounded-t-[7px] border-[1.5px] border-border/60 shadow-lg" />;', path);
  assert.equal(issues.filter((issue) => issue.rule === "decoration-class").length, 6);
  assert.deepEqual(scanDesignSource('const A = <div className="rounded-control shadow-overlay border border-border hover:border-input" />;', path), []);
});

test("decoration CSS checks include compact declarations, multiple lines and embedded templates", () => {
  const css = '.a{border-top:1px solid var(--color-border);border-radius:50%;box-shadow:\n 0 1px 2px black,\n inset 0 0 0 1px white;}';
  assert.equal(scanDesignSource(css, 'styles/example.css').filter((issue) => issue.rule === "decoration-css").length, 3);
  assert.equal(scanDesignSource('const STYLE = `' + css + '`;', path).filter((issue) => issue.rule === "decoration-css").length, 3);
  assert.deepEqual(scanDesignSource('.a{border:var(--border-width-default) solid hsl(var(--border));border-radius:var(--radius-panel);box-shadow:var(--focus-halo),var(--elevation-control);}', 'styles/example.css'), []);
});

test("style objects include directional borders without mistaking CVA variants for CSS", () => {
  assert.equal(scanDesignSource('const style = { borderTopWidth: 3, borderBottomLeftRadius: "7px" };', path).filter((issue) => issue.rule === "static-inline-style").length, 2);
  assert.deepEqual(scanDesignSource('const variants = { outline: "border border-input bg-background" };', path), []);
});

test("application CSS cannot silently override shared decoration tokens", () => {
  assert.equal(scanDesignSource('.gateway{--ring:220 13% 62%;--radius:7px;}', 'styles/example.css').filter((issue) => issue.rule === "decoration-token-override").length, 2);
  assert.equal(scanDesignSource('const style = { "--ring": ring };', path).filter((issue) => issue.rule === "decoration-token-override").length, 1);
});

test("a genuinely single-use arbitrary color is allowed, comments and token references are not uses", () => {
  assert.deepEqual(scanDesignSources([{ file: path, source: '// bg-[#abcdef]\nconst A = <div className="bg-[#abcdef] text-[hsl(var(--foreground))]" />;' }]).filter((issue) => issue.rule === "repeated-arbitrary-color"), []);
  assert.deepEqual(scanDesignSource('const A = <div className="bg-[#abcdef]" />;', path), []);
  assert.deepEqual(scanDesignSources([{ file: path, source: 'const A = <div className="border-[#abcdef]" />;' }]), []);
  assert.deepEqual(scanDesignSources([{ file: path, source: 'const A = <div className="bg-[url(icon.svg#fff)] text-[#fff]" />;' }]).filter((issue) => issue.rule === "repeated-arbitrary-color"), []);
});

test("color reuse is counted across files, utilities, templates and interaction states", () => {
  const sources = [
    { file: path, source: 'const A = <div className="bg-[#aBc]" />;' },
    { file: 'other.tsx', source: 'const B = <span className={`hover:text-[#aabbcc]/40 dark:bg-[#aabbcc80]`} />;' },
  ];
  const issues = scanDesignSources(sources).filter((issue) => issue.rule === "repeated-arbitrary-color");
  assert.equal(issues.length, 3);
  assert.ok(issues.every((issue) => issue.value.includes('#aabbcc')));
  // The exception applies until the second source use, regardless of old ledgers.
  assert.equal(compareBaseline(issues, summarizeIssues(issues)).added.length, 3);
});

test("hex, RGB and HSL variants normalize to the same base color regardless of alpha", () => {
  for (const color of ['#f00', '#FF000080', 'rgb(255_0_0)', 'rgba(100%,0%,0%,0.2)', 'hsl(0_100%_50%_/_0.4)', 'hsl(1turn,100%,50%)']) {
    assert.equal(normalizeLiteralColor(color), '#ff0000');
  }
  assert.equal(normalizeLiteralColor('hsl(var(--ring))'), undefined);
  assert.equal(normalizeLiteralColor('oklch(0.5_0.2_240_/_0.4)'), 'oklch(0.5 0.2 240)');
});

test("gradients, arbitrary CSS properties and CSS apply participate in the same inventory", () => {
  const issues = scanDesignSources([
    { file: path, source: 'const A = <div className="bg-[linear-gradient(#123456,#123456)] [color:#ABCDEF]" />;' },
    { file: 'app.css', source: '.a { @apply text-[#123456] bg-[rgb(171_205_239)]; }' },
  ]).filter((issue) => issue.rule === "repeated-arbitrary-color");
  assert.equal(issues.length, 4);
});

test("a color used by CSS or an inline value is not a single-use arbitrary color", () => {
  const issues = scanDesignSources([
    { file: path, source: 'const A = <div className="bg-[#abcdef]" />;' },
    { file: 'other.tsx', source: 'const style = { color: "rgb(171,205,239)" };' },
    { file: 'other.css', source: '/* color: #fff; */ .a{background:#abcdef;}' },
  ]).filter((issue) => issue.rule === "repeated-arbitrary-color");
  assert.equal(issues.length, 1);
  assert.equal(issues[0].file, path);
  for (const source of [
    'const A = <div className="bg-[#ffffff] text-white" />;',
    'const A = <div className="bg-[#abcdef]" />; const color = `#abcdef`;',
  ]) {
    assert.equal(scanDesignSources([{ file: path, source }]).filter((issue) => issue.rule === "repeated-arbitrary-color").length, 1);
  }
});

test("intermediate design tiers cannot return through JSX, variants or CSS apply", () => {
  const issues = scanDesignSources([
    { file: path, source: 'const A = <div className="text-ui md:text-sm p-2.5 gap-1.5 rounded-xl bg-info/15 bg-border/35 ring-ring/25 text-primary-foreground/75" />;' },
    { file: 'app.css', source: '.a { @apply text-caption px-3.5 text-foreground/[0.85]; }' },
  ]).filter((issue) => issue.rule === "design-scale");
  assert.equal(issues.length, 12);
  assert.equal(compareBaseline(issues, summarizeIssues(issues)).added.length, 12);
});

test("compact tiers retain state differences and runtime layout constraints", () => {
  const source = 'const A = <div className="text-2xs md:text-base p-4 gap-2 rounded-lg bg-info/20 hover:bg-info/40 pl-[232px] pb-[max(1rem,env(safe-area-inset-bottom))]" />;';
  assert.deepEqual(scanDesignSource(source, path), []);
});
