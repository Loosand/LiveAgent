import assert from "node:assert/strict";
import test from "node:test";
import { createTsModuleLoader } from "../helpers/load-ts-module.mjs";

const { compactReasonSummary, resolveLiveThinkingActivity } =
  createTsModuleLoader().loadModule("@liveagent/ui/lib/chat/thinkingActivity.ts");

test("marks the provider wait and reasoning stream as thinking", () => {
  assert.deepEqual(resolveLiveThinkingActivity([]), {
    active: true,
    reasonSummary: null,
  });

  assert.deepEqual(
    resolveLiveThinkingActivity([
      {
        blocks: [
          {
            kind: "thinking",
            text: "## 分析\n\n- 检查消息状态并确认接下来的处理步骤",
          },
        ],
        runningToolCallIds: [],
        thinkingOpen: true,
      },
    ]),
    {
      active: true,
      reasonSummary: "检查消息状态并确认接下来的处理步骤",
    },
  );
});

test("does not label tool execution or answer streaming as thinking", () => {
  assert.deepEqual(
    resolveLiveThinkingActivity([
      {
        blocks: [{ kind: "tool" }],
        runningToolCallIds: ["tool-1"],
      },
    ]),
    { active: false, reasonSummary: null },
  );
  assert.deepEqual(
    resolveLiveThinkingActivity([
      {
        blocks: [{ kind: "text", text: "正在回复" }],
        runningToolCallIds: [],
      },
    ]),
    { active: false, reasonSummary: null },
  );

  assert.deepEqual(
    resolveLiveThinkingActivity([
      {
        blocks: [{ kind: "tool", item: { toolResult: { isError: false } } }],
        runningToolCallIds: [],
      },
    ]),
    { active: true, reasonSummary: null },
  );
});

test("keeps the reason summary concise and plain", () => {
  const summary = compactReasonSummary(
    `此前内容\n\n**检查** [相关文件](https://example.com) ${"一".repeat(160)}`,
  );
  assert.ok(summary.startsWith("检查 相关文件"));
  assert.equal(Array.from(summary).length, 120);
  assert.ok(summary.endsWith("…"));
  assert.doesNotMatch(summary, /[*\[\]()`]/);
});
