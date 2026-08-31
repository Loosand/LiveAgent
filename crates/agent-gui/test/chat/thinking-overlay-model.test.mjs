import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { createTsModuleLoader } from "../helpers/load-ts-module.mjs";

const { resolveThinkingOverlayPlacement } = createTsModuleLoader().loadModule(
  "@liveagent/ui/lib/chat/thinkingOverlayModel.ts",
);
const roundContentSource = fs.readFileSync(
  new URL(
    "../../../agent-ui/src/components/chat/assistant-bubble/RoundContent.tsx",
    import.meta.url,
  ),
  "utf8",
);
const toolTraceSource = fs.readFileSync(
  new URL(
    "../../../agent-ui/src/components/chat/assistant-bubble/ToolTraceGroup.tsx",
    import.meta.url,
  ),
  "utf8",
);

test("places thinking details above without consuming transcript height", () => {
  const placement = resolveThinkingOverlayPlacement(
    { left: 200, right: 700, top: 500, bottom: 532, width: 500, height: 32 },
    { width: 1200, height: 800 },
  );
  assert.equal(placement.side, "above");
  assert.equal(placement.bottom, 308);
  assert.ok(placement.maxHeight >= 180);
});

test("falls below on a short viewport and clamps narrow widths", () => {
  const placement = resolveThinkingOverlayPlacement(
    { left: 8, right: 312, top: 60, bottom: 92, width: 304, height: 32 },
    { width: 320, height: 480 },
  );
  assert.equal(placement.side, "below");
  assert.equal(placement.left, 12);
  assert.equal(placement.width, 296);
});

test("keeps a renderable overlay inside an extremely narrow viewport", () => {
  const placement = resolveThinkingOverlayPlacement(
    { left: 0, right: 8, top: 60, bottom: 92, width: 8, height: 32 },
    { width: 8, height: 480 },
  );
  assert.equal(placement.left, 3.5);
  assert.equal(placement.width, 1);
  assert.ok(placement.left + placement.width <= 8);
});

test("transcript renders a compact live thinking status without restoring reasoning rows", () => {
  assert.match(roundContentSource, /ThinkingActivity/);
  assert.match(roundContentSource, /resolveLiveThinkingActivity/);
  assert.match(roundContentSource, /reasonSummary=\{thinkingActivity\.reasonSummary\}/);
  assert.doesNotMatch(roundContentSource, /activeThinkingEntry/);
  assert.match(toolTraceSource, /showThinkingStatus/);
  assert.match(toolTraceSource, /t\("chat\.thinking"\)/);
  assert.match(toolTraceSource, /const statusLabel = showTurnStatus/);
  assert.match(toolTraceSource, /\{showTurnStatus \? \(/);
});

test("GUI transcript keeps live interaction content outside the work trace", () => {
  assert.match(
    roundContentSource,
    /layout\.interaction\.map\(\(entry\) => renderEntry\(entry, false, true\)\)/,
  );
  assert.match(roundContentSource, /isLive=\{running && \(insideWorkTrace \|\| liveInteraction\)\}/);
  assert.match(roundContentSource, /filter\(\(entry\) => entry\.block\.kind !== "thinking"\)/);
  assert.match(roundContentSource, /attentionRequired=\{attentionRequired\}/);
  assert.match(
    roundContentSource,
    /hasInteractionRequiringAttention\(\[\.\.\.layout\.work, \.\.\.layout\.interaction\]\)/,
  );
  assert.match(roundContentSource, /showTurnStatus=\{insideWorkTrace && running/);
});
