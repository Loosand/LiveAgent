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
  assert.match(bubbleSource, /<LiveAssistantStatus[\s\S]*?className="w-full py-1\.5"/);
  // Without a concrete status the shared component falls back to the
  // liveness sparkle instead of the "Vibing..." filler phrase.
  assert.match(sharedStatusSource, /return <LiveSparkle className=\{className\} \/>/);
  assert.match(sharedStatusSource, /return <AssistantStatus className=\{className\}/);
});

test("desktop retry details render on the mutable live tail", () => {
  assert.match(activitySource, /retryAttempts=\{unit\.mutable \? retryAttempts : undefined\}/);
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
