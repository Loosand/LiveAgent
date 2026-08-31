import assert from "node:assert/strict";
import test from "node:test";

import { createTsModuleLoader } from "../helpers/load-ts-module.mjs";

const loader = createTsModuleLoader();
const { groupProviderWorkspace, isProviderConnectionEnabled, providerMatchesQuery } =
  loader.loadModule("@liveagent/ui/pages/settings/providerWorkspace.ts");

function provider(overrides = {}) {
  return {
    id: "provider-1",
    name: "Primary OpenAI",
    type: "codex",
    baseUrl: "https://api.example.com/v1",
    apiKey: "secret",
    apiKeyConfigured: true,
    activeModels: ["gpt-5"],
    ...overrides,
  };
}

test("provider workspace groups enabled, inactive, and missing connection types", () => {
  const enabled = provider();
  const inactive = provider({
    id: "provider-2",
    name: "Anthropic Draft",
    type: "claude_code",
    apiKey: "",
    apiKeyConfigured: false,
    activeModels: [],
  });

  assert.equal(isProviderConnectionEnabled(enabled), true);
  assert.equal(isProviderConnectionEnabled(inactive), false);
  assert.deepEqual(groupProviderWorkspace([enabled, inactive], ["codex", "claude_code", "gemini"]), {
    enabled: [enabled],
    inactive: [inactive],
    missingTypes: ["gemini"],
  });
});

test("provider directory search covers connection name, endpoint, type, and vendor label", () => {
  const connection = provider();

  assert.equal(providerMatchesQuery(connection, "primary", "OpenAI"), true);
  assert.equal(providerMatchesQuery(connection, "example.com", "OpenAI"), true);
  assert.equal(providerMatchesQuery(connection, "codex", "OpenAI"), true);
  assert.equal(providerMatchesQuery(connection, "openai", "OpenAI"), true);
  assert.equal(providerMatchesQuery(connection, "anthropic", "OpenAI"), false);
});
