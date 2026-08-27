import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const roundContentSource = fs.readFileSync(
  new URL(
    "../../../agent-ui/src/components/chat/assistant-bubble/RoundContent.tsx",
    import.meta.url,
  ),
  "utf8",
);
const thinkingSource = fs.readFileSync(
  new URL("../../../agent-ui/src/components/chat/ThinkingActivity.tsx", import.meta.url),
  "utf8",
);
const hostedSearchSource = fs.readFileSync(
  new URL("../../../agent-ui/src/components/chat/HostedSearchGroupView.tsx", import.meta.url),
  "utf8",
);

test("tool and operation blocks share clear vertical separation from prose", () => {
  assert.match(roundContentSource, /const isOperationBlock = block\.kind !== "text";/);
  assert.match(roundContentSource, /isOperationBlock && "my-3"/);
  assert.match(roundContentSource, /data-assistant-operation=\{isOperationBlock \? "" : undefined\}/);
});

test("operation components defer outer spacing to the shared block wrapper", () => {
  assert.doesNotMatch(thinkingSource, /className="[^"]*\bmy-/);
  assert.doesNotMatch(hostedSearchSource, /className="[^"]*\bmy-/);
});
