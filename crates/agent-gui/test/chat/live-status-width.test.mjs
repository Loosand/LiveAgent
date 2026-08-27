import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const activitySource = fs.readFileSync(
  new URL("../../src/pages/chat/transcript/AssistantActivityRow.tsx", import.meta.url),
  "utf8",
);
const bubbleSource = fs.readFileSync(
  new URL("../../src/pages/chat/components/AssistantBubble.tsx", import.meta.url),
  "utf8",
);
const sharedStatusSource = fs.readFileSync(
  new URL("../../../agent-ui/src/components/chat/AssistantStatus.tsx", import.meta.url),
  "utf8",
);
const workTraceSource = fs.readFileSync(
  new URL("../../../agent-ui/src/components/chat/AssistantWorkTrace.tsx", import.meta.url),
  "utf8",
);

test("desktop live status cannot widen the transcript", () => {
  assert.match(activitySource, /min-w-0 w-full max-w-full/);
  assert.match(bubbleSource, /min-w-0 max-w-full overflow-hidden py-1\.5/);
  assert.match(bubbleSource, /<LiveAssistantStatus[\s\S]*?className="w-full"/);
  assert.match(sharedStatusSource, /return <VibingText className=\{className\}/);
  assert.match(sharedStatusSource, /return <AssistantStatus className=\{className\}/);
});

test("desktop retry details render only in the stable live-status unit", () => {
  assert.match(
    activitySource,
    /retryAttempts=\{\s*unit\.mutable && unit\.unit\.kind === "status"\s*\? retryAttempts\s*: undefined\s*\}/,
  );
  assert.doesNotMatch(activitySource, /retryAttempts=\{unit\.mutable \? retryAttempts/);
  assert.match(
    bubbleSource,
    /@liveagent\/ui\/components\/chat\/RetryDetailsBlock/,
  );
});

test("standalone work trace aligns its header with the assistant avatar", () => {
  assert.match(workTraceSource, /className=\{cn\("my-2 text-foreground\/60", className\)\}/);
  assert.match(
    bubbleSource,
    /<AssistantWorkTrace[\s\S]*?className="mb-3 mt-0"[\s\S]*?hasDetails=/,
  );
});
