#!/usr/bin/env node
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { resolve, relative } from "node:path";
import { compareBaseline, ruleDescriptions, scanDesignSources, summarizeIssues } from "./ui-design-rules.mjs";

const root = resolve(import.meta.dirname, "..");
const roots = ["crates/agent-ui/src", "crates/agent-gui/src", "crates/agent-gateway/web/src"];
const tokenFile = "crates/agent-ui/src/styles/tokens.css";
const ledgerPath = resolve(root, "scripts/ui-design-baseline.json");
const mode = process.argv[2] ?? "--check";
if (!["--check", "--report", "--json", "--prune", "--strict"].includes(mode)) throw new Error("Use --check, --report, --json, --prune or --strict");
function files(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name);
    return entry.isDirectory() ? files(path) : /\.(tsx?|css)$/.test(entry.name) ? [path] : [];
  });
}
const sources = roots.flatMap((directory) => files(resolve(root, directory))).flatMap((file) => {
  const name = relative(root, file).replaceAll("\\", "/");
  if (name === tokenFile || /(?:\.generated|\.d)\.ts$/.test(name)) return [];
  return [{ source: readFileSync(file, "utf8"), file: name }];
});
const issues = scanDesignSources(sources);
if (mode === "--json") {
  console.log(JSON.stringify(issues, null, 2));
} else {
  const baseline = JSON.parse(readFileSync(ledgerPath, "utf8"));
  const result = compareBaseline(issues, baseline);
  if (mode === "--prune") {
    const current = summarizeIssues(issues);
    const pruned = Object.fromEntries(Object.entries(baseline).filter(([key]) => current[key]).map(([key, count]) => [key, Math.min(count, current[key])]));
    writeFileSync(ledgerPath, `${JSON.stringify(pruned, null, 2)}\n`);
    console.log(`Removed ${result.resolved.length} resolved entries. New violations are never added by --prune.`);
  }
  for (const [rule, description] of Object.entries(ruleDescriptions)) {
    console.log(`${rule}: ${issues.filter((issue) => issue.rule === rule).length} — ${description}`);
  }
  if (mode === "--report") {
    const byFile = new Map();
    for (const issue of issues) byFile.set(issue.file, (byFile.get(issue.file) ?? 0) + 1);
    console.log("\nFiles with most remaining migration work:");
    for (const [file, count] of [...byFile].sort((a, b) => b[1] - a[1]).slice(0, 20)) console.log(`${count} ${file}`);
  } else {
    const failures = mode === "--strict" ? Object.entries(summarizeIssues(issues)) : result.added;
    if (failures.length) {
      const keys = new Set(failures.map(([key]) => key));
      for (const issue of issues.filter((item) => keys.has(`${item.file}:${item.rule}:${item.fingerprint}`)).slice(0, 30)) {
        console.error(`${issue.file}:${issue.line} [${issue.rule}] ${issue.value}`);
      }
      console.error(`UI design check failed: ${failures.length} ${mode === "--strict" ? "remaining" : "new/increased"} entries. See design.md; do not increase the baseline to pass.`);
      process.exitCode = 1;
    } else console.log(`UI design check passed (no new debt; ${issues.length} existing occurrences remain).`);
  }
}
