import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createTsModuleLoader } from "../helpers/load-ts-module.mjs";

const loader = createTsModuleLoader();
const overlay = loader.loadModule(
  "@liveagent/ui/components/chat/MentionComposerOverlays.tsx",
);
const source = readFileSync(
  new URL(
    "../../../agent-ui/src/components/chat/MentionComposerOverlays.tsx",
    import.meta.url,
  ),
  "utf8",
);

test("mention popup list stays compact and adapts to the room above the composer", () => {
  assert.equal(overlay.resolveMentionPopupListMaxHeight(1_000), 240);
  assert.equal(overlay.resolveMentionPopupListMaxHeight(170), 116);
  assert.equal(overlay.resolveMentionPopupListMaxHeight(80), 76);
});

test("mention popup rows keep file names aligned with their icons", () => {
  assert.match(source, /mention-popup-item[^"\n]*text-left/);
  assert.doesNotMatch(source, /max-h-\[320px\]/);
});
