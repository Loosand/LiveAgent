import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { createTsModuleLoader } from "../helpers/load-ts-module.mjs";

const iconsPath = fileURLToPath(
  new URL("../../../agent-ui/src/components/IconSet.tsx", import.meta.url),
);
const utilsPath = fileURLToPath(new URL("../../src/lib/shared/utils.ts", import.meta.url));
const localeContextPath = fileURLToPath(
  new URL("../../../agent-ui/src/i18n/LocaleContext.tsx", import.meta.url),
);
const taskProgressIndicatorPath = fileURLToPath(
  new URL(
    "../../../agent-ui/src/components/chat/TaskProgressIndicator.tsx",
    import.meta.url,
  ),
);

const labels = {
  title: "Task progress",
  step: "Step 2 of 3",
  completedCount: "1/3 completed",
  running: "Running",
  pending: "Pending",
  paused: "Paused",
  completed: "All completed",
  taskPaused: "Paused",
  taskCompleted: "Completed",
};

function createHookHarness() {
  let idIndex = 0;
  const react = {
    useId() {
      return `task-progress-panel-${idIndex++}`;
    },
  };
  return {
    react,
    render(run) {
      idIndex = 0;
      return run();
    },
  };
}

function createIndicatorHarness() {
  const hooks = createHookHarness();
  const loader = createTsModuleLoader({
    mocks: {
      react: hooks.react,
      [iconsPath]: {
        Check: (props) => ({ type: "Check", props }),
      },
      [utilsPath]: {
        cn(...values) {
          return values.filter(Boolean).join(" ");
        },
      },
    },
  });
  const { TaskProgressIndicator } = loader.loadModule(
    "@liveagent/ui/components/chat/TaskProgressIndicator.tsx",
  );
  return {
    hooks,
    render(props = {}) {
      return hooks.render(() =>
        TaskProgressIndicator({
          snapshot: createSnapshot(),
          isConversationRunning: true,
          labels,
          ...props,
        }),
      );
    },
  };
}

function createSnapshot(overrides = {}) {
  const tasks =
    overrides.tasks ??
    [
      {
        id: "1",
        subject: "Inspect",
        description: "Inspect completion criteria",
        status: "completed",
        activeForm: "Inspecting",
      },
      {
        id: "2",
        subject: "Implement",
        description: "Implement completion criteria",
        status: "in_progress",
        activeForm: "Implementing",
      },
      {
        id: "3",
        subject: "Verify",
        description: "Verify completion criteria",
        status: "pending",
        activeForm: "Verifying",
      },
    ];
  return {
    runId: "run-1",
    revision: 3,
    tasks,
    completedCount: 1,
    totalCount: tasks.length,
    currentStep: 2,
    state: "in_progress",
    ...overrides,
  };
}

function findAll(node, predicate, matches = []) {
  if (Array.isArray(node)) {
    for (const child of node) findAll(child, predicate, matches);
    return matches;
  }
  if (!node || typeof node !== "object") return matches;
  if (predicate(node)) matches.push(node);
  findAll(node.props?.children, predicate, matches);
  return matches;
}

function treeText(node) {
  if (Array.isArray(node)) return node.map(treeText).join("");
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (!node || typeof node !== "object") return "";
  return treeText(node.props?.children);
}

function statusIcons(node) {
  return findAll(
    node,
    (child) => typeof child.type === "function" && child.type.name === "TaskStatusIcon",
  );
}

function readIndicator(tree) {
  const allButtons = findAll(tree, (node) => node.type === "button");
  const trigger = allButtons.find((button) => button.props?.["data-task-progress-toggle"] === "");
  return {
    root: tree,
    trigger,
    otherButtons: allButtons.filter((button) => button !== trigger),
    panel: findAll(tree, (node) => node.props?.["data-task-progress-panel"] === "")[0],
    list: findAll(tree, (node) => node.type === "ul")[0],
    progress: findAll(tree, (node) => node.props?.role === "progressbar")[0],
    rows: findAll(tree, (node) => typeof node.props?.["data-task-status"] === "string"),
  };
}

test("renders a compact trigger whose task list never occupies layout space", () => {
  const { root, trigger, otherButtons, panel, progress, rows } = readIndicator(
    createIndicatorHarness().render(),
  );

  assert.equal(root.type, "div");
  assert.equal(root.props["data-task-progress-root"], "");
  // 药丸按内容收缩，不再撑成固定宽度的常驻卡片。
  assert.match(root.props.className, /\binline-flex\b/);
  assert.match(root.props.className, /group\/task-progress/);
  assert.doesNotMatch(root.props.className, /max-w-\[440px\]/);
  assert.doesNotMatch(root.props.className, /\bmb-4\b/);

  // 触发器只留状态图标与步进文案。
  assert.equal(treeText(trigger), "Step 2 of 3");
  assert.equal(trigger.props["aria-label"], "Task progress · Step 2 of 3 · 1/3 completed · Running");
  assert.equal(trigger.props["aria-describedby"], panel.props.id);
  assert.equal(trigger.props.onClick, undefined);
  assert.equal(otherButtons.length, 0);
  assert.equal(statusIcons(trigger)[0].props.state, "running");

  // 浮层绝对定位在触发器之上，默认透明且不吃指针，hover / 键盘聚焦才显形。
  assert.equal(panel.props.role, "tooltip");
  assert.match(panel.props.className, /\babsolute\b/);
  assert.match(panel.props.className, /\bbottom-full\b/);
  assert.match(panel.props.className, /\bpointer-events-none\b/);
  assert.match(panel.props.className, /\bopacity-0\b/);
  assert.match(panel.props.className, /group-hover\/task-progress:opacity-100/);
  assert.match(panel.props.className, /group-hover\/task-progress:pointer-events-auto/);
  assert.match(panel.props.className, /group-focus-within\/task-progress:opacity-100/);
  assert.match(panel.props.className, /motion-reduce:transition-none/);
  assert.equal(panel.props.hidden, undefined);

  assert.equal(progress.props["aria-label"], "Task progress · Step 2 of 3 · 1/3 completed · Running");
  assert.deepEqual(
    [progress.props["aria-valuemin"], progress.props["aria-valuenow"], progress.props["aria-valuemax"]],
    [0, 1, 3],
  );

  assert.equal(rows.length, 3);
  assert.match(treeText(panel), /Inspect/);
  assert.match(treeText(panel), /Implement/);
  assert.match(treeText(panel), /Verify/);
});

test("lists task subjects only, dropping descriptions and per-row disclosure", () => {
  const { panel, rows } = readIndicator(createIndicatorHarness().render());

  assert.deepEqual(
    rows.map((row) => row.type),
    ["li", "li", "li"],
  );
  assert.doesNotMatch(treeText(panel), /completion criteria/);
  assert.doesNotMatch(treeText(panel), /Inspecting|Implementing|Verifying/);
  for (const row of rows) {
    assert.equal(row.props["aria-expanded"], undefined);
    assert.equal(row.props["aria-controls"], undefined);
  }
});

test("keeps task labels stable and scopes the spinning ring to the running row", () => {
  const indicator = createIndicatorHarness();
  const runningRow = readIndicator(
    indicator.render({
      snapshot: createSnapshot({
        tasks: [
          {
            id: "stable",
            subject: "Stable task",
            description: "Stable completion criteria",
            status: "in_progress",
            activeForm: "Changing label",
          },
        ],
        completedCount: 0,
        totalCount: 1,
        currentStep: 1,
        state: "in_progress",
      }),
    }),
  ).rows[0];

  assert.match(treeText(runningRow), /Stable task/);
  assert.doesNotMatch(treeText(runningRow), /Changing label/);
  assert.equal(runningRow.props["data-task-status"], "in_progress");
  assert.equal(runningRow.props["aria-current"], "step");
  assert.equal(statusIcons(runningRow)[0].props.state, "running");

  const completedRow = readIndicator(
    indicator.render({
      snapshot: createSnapshot({
        tasks: [
          {
            id: "stable",
            subject: "Stable task",
            description: "Stable completion criteria",
            status: "completed",
            activeForm: "Changed again",
          },
        ],
        completedCount: 1,
        totalCount: 1,
        currentStep: 1,
        state: "completed",
      }),
    }),
  ).rows[0];

  assert.match(treeText(completedRow), /Stable task/);
  assert.doesNotMatch(treeText(completedRow), /Changed again/);
  assert.equal(completedRow.props["data-task-status"], "completed");
  assert.equal(completedRow.props["aria-current"], undefined);
  assert.equal(statusIcons(completedRow)[0].props.state, "completed");
});

test("reflects pending, paused, and completed states in the trigger and rows", () => {
  const indicator = createIndicatorHarness();

  const paused = readIndicator(indicator.render({ isConversationRunning: false }));
  assert.equal(statusIcons(paused.trigger)[0].props.state, "paused");
  assert.equal(statusIcons(paused.rows[0])[0].props.state, "completed");
  assert.equal(statusIcons(paused.rows[1])[0].props.state, "paused");
  assert.equal(statusIcons(paused.rows[2])[0].props.state, "pending");
  assert.match(paused.progress.props["aria-label"], /Paused/);
  assert.match(treeText(paused.panel), /Paused/);

  const pending = createSnapshot({
    tasks: [
      {
        id: "wait",
        subject: "Wait",
        description: "Wait completion criteria",
        status: "pending",
        activeForm: "Waiting",
      },
    ],
    completedCount: 0,
    totalCount: 1,
    currentStep: 1,
    state: "pending",
  });
  const pendingView = readIndicator(indicator.render({ snapshot: pending }));
  assert.equal(statusIcons(pendingView.trigger)[0].props.state, "pending");
  assert.equal(treeText(pendingView.trigger), "Step 2 of 3");
  assert.match(treeText(pendingView.panel), /Pending/);

  const completed = createSnapshot({
    tasks: createSnapshot().tasks.map((task) => ({ ...task, status: "completed" })),
    completedCount: 3,
    currentStep: 3,
    state: "completed",
  });
  const completedView = readIndicator(indicator.render({ snapshot: completed }));
  assert.equal(statusIcons(completedView.trigger)[0].props.state, "completed");
  // 计划跑完后药丸改用汇总文案，步进数字已无信息量。
  assert.equal(treeText(completedView.trigger), "All completed");
  assert.match(completedView.progress.props["aria-label"], /All completed/);
  assert.equal(completedView.rows.length, 3);
});

test("shared task progress bar localizes labels and handles an empty snapshot", () => {
  const indicator = (props) => ({ type: "TaskProgressIndicator", props });
  const translations = {
    "chat.taskProgress.title": "Task progress",
    "chat.taskProgress.step": "Step {current} of {total}",
    "chat.taskProgress.completedCount": "completed",
    "chat.taskProgress.running": "Running",
    "chat.taskProgress.pending": "Pending",
    "chat.taskProgress.paused": "Paused",
    "chat.taskProgress.completed": "All completed",
    "chat.taskProgress.taskPaused": "Paused",
    "chat.taskProgress.taskCompleted": "Completed",
  };
  const loader = createTsModuleLoader({
    mocks: {
      [localeContextPath]: {
        useLocale: () => ({ t: (key) => translations[key] ?? key }),
      },
      [taskProgressIndicatorPath]: { TaskProgressIndicator: indicator },
    },
  });
  const { TaskProgressBar } = loader.loadModule(
    "@liveagent/ui/components/chat/TaskProgressBar.tsx",
  );
  const snapshot = createSnapshot();
  const tree = TaskProgressBar({ snapshot, isConversationRunning: true });

  assert.equal(tree.type, indicator);
  assert.deepEqual(tree.props.labels, labels);
  assert.equal(TaskProgressBar({ snapshot: null, isConversationRunning: false }), null);
});
