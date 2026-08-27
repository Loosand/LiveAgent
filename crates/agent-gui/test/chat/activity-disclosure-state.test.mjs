import assert from "node:assert/strict";
import test from "node:test";
import { createDomTestEnv } from "../helpers/dom-test-env.mjs";

const EmptyIcon = () => null;
const env = await createDomTestEnv({
  mocks: {
    "@liveagent/adapters/assistantBubble": { retainRunningToolContent: false },
    "@liveagent/ui/components/chat/AssistantStatus": {
      AssistantStatus: ({ children }) => children,
    },
    "@liveagent/ui/components/chat/LazyCollapse": {
      LazyCollapse: ({ children, open }) => (open ? children() : null),
    },
    "@liveagent/ui/components/chat/assistant-bubble/ToolCallItem": {
      MemoToolCallItem: () => null,
      areToolTraceItemsEqual: () => false,
    },
    "@liveagent/ui/components/chat/assistant-bubble/assistantBubbleUtils": {
      getToolActivityCategory: () => "read",
      getToolTraceKey: (item, index) => item.toolCall.id ?? String(index),
    },
    "@liveagent/ui/components/IconSet": { ChevronDown: EmptyIcon },
    "@liveagent/ui/i18n/index": {
      useLocale: () => ({
        locale: "zh-CN",
        t: (key) =>
          ({
            "chat.tool.batch.read": "读取了文件",
            "chat.tool.batch.command": "运行了命令",
          })[key] ?? key,
      }),
    },
    "@liveagent/ui/lib/shared/utils": {
      cn: (...values) => values.filter(Boolean).join(" "),
    },
    "../../IconSet": {
      Bot: EmptyIcon,
      ChevronRight: EmptyIcon,
      Eye: EmptyIcon,
      FilePenLine: EmptyIcon,
      FolderTree: EmptyIcon,
      Search: EmptyIcon,
      Terminal: EmptyIcon,
      Wrench: EmptyIcon,
    },
    "./assistantBubbleUtils": {
      getToolActivityCategory: (name) => (name === "Bash" ? "command" : "read"),
      getToolTraceKey: (item, index) => item.toolCall.id ?? String(index),
      hasActiveUserInteraction: (items, runningToolCallIds) =>
        items.some(
          (item) =>
            !item.toolResult &&
            ["AskUserQuestion", "ExitPlanMode"].includes(item.toolCall.name) &&
            runningToolCallIds.includes(item.toolCall.id),
        ),
    },
    "./ToolCallItem": {
      MemoToolCallItem: () => null,
      areToolTraceItemsEqual: () => false,
    },
  },
});
const { React, act, createRoot } = env;

const { AssistantWorkTrace } = env.loadModule(
  "@liveagent/ui/components/chat/AssistantWorkTrace.tsx",
);
const { ToolTraceGroup } = env.loadModule(
  "@liveagent/ui/components/chat/assistant-bubble/ToolTraceGroup.tsx",
);

function click(element) {
  act(() => element.dispatchEvent(new MouseEvent("click", { bubbles: true })));
}

function renderWorkTrace(root, running, attentionRequired = false) {
  act(() => {
    root.render(
      React.createElement(AssistantWorkTrace, {
        hasDetails: true,
        attentionRequired,
        running,
        children: React.createElement("div", { "data-testid": "work-details" }),
      }),
    );
  });
}

const toolItem = {
  toolCall: { id: "tool-1", name: "read_file", arguments: {} },
  toolResult: { isError: false },
};

function renderToolTrace(root, running, items = [toolItem]) {
  act(() => {
    root.render(
      React.createElement(ToolTraceGroup, {
        items,
        runningToolCallIds: running ? items.map((item) => item.toolCall.id) : [],
      }),
    );
  });
}

test("manual work-trace disclosure survives running state transitions", () => {
  const container = document.createElement("div");
  const root = createRoot(container);

  renderWorkTrace(root, true);
  const button = container.querySelector("button");
  assert.equal(button.getAttribute("aria-expanded"), "false");

  click(button);
  assert.equal(button.getAttribute("aria-expanded"), "true");

  renderWorkTrace(root, false);
  assert.equal(button.getAttribute("aria-expanded"), "true");
  renderWorkTrace(root, true);
  assert.equal(button.getAttribute("aria-expanded"), "true");

  click(button);
  assert.equal(button.getAttribute("aria-expanded"), "false");
  renderWorkTrace(root, false);
  assert.equal(button.getAttribute("aria-expanded"), "false");

  act(() => root.unmount());
});

test("a new blocking interaction opens the work trace once without stealing later control", () => {
  const container = document.createElement("div");
  const root = createRoot(container);

  renderWorkTrace(root, true, false);
  const button = container.querySelector("button");
  assert.equal(button.getAttribute("aria-expanded"), "false");

  renderWorkTrace(root, true, true);
  assert.equal(button.getAttribute("aria-expanded"), "true");

  click(button);
  assert.equal(button.getAttribute("aria-expanded"), "false");
  renderWorkTrace(root, true, true);
  assert.equal(button.getAttribute("aria-expanded"), "false");

  renderWorkTrace(root, true, false);
  assert.equal(button.getAttribute("aria-expanded"), "false");
  renderWorkTrace(root, true, true);
  assert.equal(button.getAttribute("aria-expanded"), "true");
  renderWorkTrace(root, true, false);
  assert.equal(button.getAttribute("aria-expanded"), "true");

  act(() => root.unmount());
});

test("manual tool-batch disclosure survives tool completion and restart", () => {
  const container = document.createElement("div");
  const root = createRoot(container);

  renderToolTrace(root, true);
  const button = container.querySelector("button");
  assert.equal(button.getAttribute("aria-expanded"), "false");

  click(button);
  assert.equal(button.getAttribute("aria-expanded"), "true");

  renderToolTrace(root, false);
  assert.equal(button.getAttribute("aria-expanded"), "true");
  renderToolTrace(root, true);
  assert.equal(button.getAttribute("aria-expanded"), "true");

  click(button);
  assert.equal(button.getAttribute("aria-expanded"), "false");
  renderToolTrace(root, false);
  assert.equal(button.getAttribute("aria-expanded"), "false");

  act(() => root.unmount());
});

test("a tool batch opens when a pending user interaction appears inside it", () => {
  const container = document.createElement("div");
  const root = createRoot(container);
  const interactionItem = {
    toolCall: { id: "interaction-1", name: "ExitPlanMode", arguments: { plan: "Plan" } },
  };

  renderToolTrace(root, false, [interactionItem]);
  const button = container.querySelector("button");
  assert.equal(button.getAttribute("aria-expanded"), "false");

  renderToolTrace(root, true, [interactionItem]);
  assert.equal(button.getAttribute("aria-expanded"), "true");

  click(button);
  assert.equal(button.getAttribute("aria-expanded"), "false");
  renderToolTrace(root, true, [interactionItem]);
  assert.equal(button.getAttribute("aria-expanded"), "false");

  act(() => root.unmount());
});

test("mixed tool batch labels are contiguous without dot separators", () => {
  const container = document.createElement("div");
  const root = createRoot(container);
  const commandItem = {
    toolCall: { id: "tool-2", name: "Bash", arguments: { command: "pnpm test" } },
    toolResult: { isError: false },
  };

  act(() => {
    root.render(
      React.createElement(ToolTraceGroup, {
        items: [toolItem, commandItem],
      }),
    );
  });

  const label = container.querySelector("button").textContent;
  assert.equal(label, "读取了文件运行了命令");
  assert.doesNotMatch(label, /[·•]/);

  act(() => root.unmount());
});

test.after(() => env.cleanup());
