import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const providersSectionSource = ["ProviderModal.tsx", "ProviderModalView.tsx"]
  .map((file) =>
    readFileSync(
      new URL(`../../../agent-ui/src/pages/settings/${file}`, import.meta.url),
      "utf8",
    ),
  )
  .join("\n");
const providerListSource = readFileSync(
  new URL("../../../agent-ui/src/pages/settings/ProvidersSection.tsx", import.meta.url),
  "utf8",
);
const providerPresentationSource = readFileSync(
  new URL("../../../agent-ui/src/pages/settings/ProviderPresentation.tsx", import.meta.url),
  "utf8",
);
const responsiveStylesSource = readFileSync(
  new URL("../src/styles/responsive.css", import.meta.url),
  "utf8",
);

test("WebUI provider model refresh only disables while a request is running", () => {
  const clickHandlerIndex = providersSectionSource.indexOf("onClick={handleRefresh}");
  assert.notEqual(clickHandlerIndex, -1);

  const openingTagStart = providersSectionSource.lastIndexOf("<Button", clickHandlerIndex);
  const openingTagEnd = providersSectionSource.indexOf(">", clickHandlerIndex);
  assert.notEqual(openingTagStart, -1);
  assert.notEqual(openingTagEnd, -1);

  const openingTag = providersSectionSource.slice(openingTagStart, openingTagEnd + 1);
  assert.match(openingTag, /disabled=\{fetchingModels\}/);
  assert.doesNotMatch(openingTag, /isGatewayWebui|canFetchModels/);
});

test("provider model refresh accepts a saved WebUI key without exposing it", () => {
  const handlerStart = providersSectionSource.indexOf("function handleRefresh()");
  const handlerEnd = providersSectionSource.indexOf("function toggleModel", handlerStart);
  assert.notEqual(handlerStart, -1);
  assert.notEqual(handlerEnd, -1);

  const handlerSource = providersSectionSource.slice(handlerStart, handlerEnd);
  assert.match(handlerSource, /!trimUrl && !modelsUrl\.trim\(\)/);
  assert.match(handlerSource, /!trimKey && !canReuseStoredApiKey/);
  assert.match(handlerSource, /setFetchError\(t\("settings\.noBaseUrlApiKey"\)\)/);
  assert.match(providersSectionSource, /canReuseStoredApiKey\s*=\s*isGatewayWebui\s*&&\s*apiKeyIsRedactedDisplay/);
  const reuseGuardStart = providersSectionSource.indexOf("const canReuseStoredApiKey");
  const reuseGuardEnd = providersSectionSource.indexOf("const persistedUsageQueryProviderId", reuseGuardStart);
  assert.notEqual(reuseGuardStart, -1);
  assert.notEqual(reuseGuardEnd, -1);
  assert.doesNotMatch(providersSectionSource.slice(reuseGuardStart, reuseGuardEnd), /isFullUrl\s*===/);
  assert.match(providersSectionSource, /providerId: initialData\?\.id/);
});

test("provider overview cards keep actions in a dedicated footer", () => {
  assert.match(providerListSource, /settings-provider-overview-card/);
  assert.match(providerListSource, /<footer className="flex items-center justify-end gap-3 border-t/);
  assert.doesNotMatch(responsiveStylesSource, /\.settings-provider-card-row\s*\{/);
});

test("provider overview groups connections by vendor and marks enabled connections in green", () => {
  assert.match(providerListSource, /PROVIDER_TABS\.map\(\(type\) => \(\{/);
  assert.match(providerListSource, /isProviderConnectionEnabled\(provider\)/);
  assert.match(providerListSource, /enabled \? "bg-emerald-500/);
  assert.match(providerListSource, /event\.target\.closest\("button, a, input, select, textarea/);
});

test("provider detail navigation uses a horizontally scrollable top tab bar", () => {
  assert.match(providersSectionSource, /settings-provider-detail-tabs/);
  assert.match(
    providersSectionSource,
    /settings-provider-detail-tabs flex shrink-0 items-center gap-1 overflow-x-auto border-b/,
  );
  assert.match(providersSectionSource, /relative flex h-11 min-w-max items-center gap-2/);
  assert.doesNotMatch(providersSectionSource, /settings-provider-dialog-sidebar/);
});

test("provider detail uses quiet active states and explicit green switches", () => {
  assert.doesNotMatch(providersSectionSource, /useSystemProxy && "border-primary\/35/);
  assert.doesNotMatch(providersSectionSource, /streamRetryMode === value && "border-primary/);
  assert.match(providersSectionSource, /PROVIDER_INLINE_CHOICE_ACTIVE_CLASS/);
  assert.match(providersSectionSource, /tone="success"/);
  assert.match(providerListSource, /tone="success"/);
  assert.match(providerPresentationSource, /checked && "bg-emerald-500"/);
});
