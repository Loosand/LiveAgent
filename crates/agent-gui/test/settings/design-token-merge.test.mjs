import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { transpileTypeScriptModule } from "../../../../scripts/typescript-source-tools.mjs";

const url = new URL("../../../agent-ui/src/lib/shared/utils.ts", import.meta.url);
const code = transpileTypeScriptModule(readFileSync(url, "utf8"), fileURLToPath(url));
const module = { exports: {} };
new Function("require", "module", "exports", code)(createRequire(url), module, module.exports);
const { cn } = module.exports;

test("compact type sizes survive text color merging and can override built-in sizes", () => {
  for (const size of ["2xs", "xs", "base"]) {
    assert.equal(cn("text-base", `text-${size}`, "text-foreground"), `text-${size} text-foreground`);
    assert.equal(cn(`text-${size}`, "text-muted-foreground", "text-xs"), "text-muted-foreground text-xs");
  }
});
test("semantic color and size variants retain independent responsive and focus states", () => {
  assert.equal(cn("text-2xs text-warning", "text-success", "md:text-base", "focus:text-info"), "text-2xs text-success md:text-base focus:text-info");
});

test("role radii and elevation override defaults without losing border or focus states", () => {
  assert.equal(cn("rounded-lg border border-input", "rounded-control"), "border border-input rounded-control");
  assert.equal(cn("rounded-overlay", "rounded-none", "sm:rounded-overlay"), "rounded-none sm:rounded-overlay");
  assert.equal(cn("shadow-lg", "shadow-overlay", "shadow-control", "focus:shadow-focus"), "shadow-control focus:shadow-focus");
});
