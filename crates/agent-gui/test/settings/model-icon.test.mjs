import assert from "node:assert/strict";
import test from "node:test";

import { createTsModuleLoader } from "../helpers/load-ts-module.mjs";

const loader = createTsModuleLoader();
const { resolveModelIconBrand } = loader.loadModule(
  "@liveagent/ui/lib/models/modelIcon.ts",
);

test("model icons resolve common direct and routed model families", () => {
  assert.equal(resolveModelIconBrand("gpt-5.2-codex"), "openai");
  assert.equal(resolveModelIconBrand("anthropic/claude-sonnet-4.5"), "claude");
  assert.equal(resolveModelIconBrand("google/gemini-2.5-pro"), "gemini");
  assert.equal(resolveModelIconBrand("deepseek/deepseek-v4"), "deepseek");
  assert.equal(resolveModelIconBrand("qwen/qwen3-coder"), "qwen");
  assert.equal(resolveModelIconBrand("meta-llama/llama-4"), "meta");
  assert.equal(resolveModelIconBrand("moonshot/kimi-k2"), "moonshot");
});

test("model icon resolver falls back to the connection protocol", () => {
  assert.equal(resolveModelIconBrand("custom-model", "claude_code"), "claude");
  assert.equal(resolveModelIconBrand("custom-model", "codex"), "openai");
  assert.equal(resolveModelIconBrand("custom-model", "xai"), "grok");
  assert.equal(resolveModelIconBrand("custom-model", "unknown"), null);
});
