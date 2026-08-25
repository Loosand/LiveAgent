import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { createWebModuleLoader } from "../../test/helpers/load-web-module.mjs";

const rootDir = fileURLToPath(new URL("../", import.meta.url));
const iconsPath = fileURLToPath(
  new URL("../../../agent-ui/src/components/IconSet.tsx", import.meta.url),
);
const utilsPath = fileURLToPath(new URL("../src/lib/shared/utils.ts", import.meta.url));
const localeContextPath = fileURLToPath(
  new URL("../../../agent-ui/src/i18n/LocaleContext.tsx", import.meta.url),
);
const taskProgressIndicatorPath = fileURLToPath(
  new URL("../../../agent-ui/src/components/chat/TaskProgressIndicator.tsx", import.meta.url),
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
  const states = [];
  const refs = [];
  let stateIndex = 0;
  let refIndex = 0;
  let idIndex = 0;
  const react = {
    useState(initialValue) {
      const index = stateIndex++;
      if (!(index in states)) {
        states[index] = typeof initialValue === "function" ? initialValue() : initialValue;
      }
      return [
        states[index],
        (next) => {
          states[index] = typeof next === "function" ? next(states[index]) : next;
        },
      ];
    },
    useRef(initialValue) {
      const index = refIndex++;
      if (!(index in refs)) refs[index] = { current: initialValue };
      return refs[index];
    },
    useId() {
      return `task-progress-panel-${idIndex++}`;
    },
    useEffect() {},
  };
  return {
    react,
    refs,
    render(run) {
      stateIndex = 0;
      refIndex = 0;
      idIndex = 0;
      return run();
    },
  };
}

function createIndicatorHarness() {
  const hooks = createHookHarness();
  const loader = createWebModuleLoader({
    rootDir,
    mocks: {
      react: hooks.react,
      [iconsPath]: {
        Check: (props) => ({ type: "Check", props }),
        ChevronDown: (props) => ({ type: "ChevronDown", props }),
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

function readIndicator(tree) {
  return {
    root: tree,
    buttons: findAll(tree, (node) => node.type === "button"),
    details: findAll(
      tree,
      (node) =>
        node.type === "div" &&
        typeof node.props?.id === "string" &&
        node.props.id.includes("-task-"),
    ),
    progress: findAll(tree, (node) => node.props?.role === "progressbar")[0],
    rows: findAll(tree, (node) => typeof node.props?.["data-task-status"] === "string"),
  };
}

test("web renders real task rows with progress semantics and reduced-motion transitions", () => {
  const indicator = createIndicatorHarness();
  const { root, buttons, details, progress, rows } = readIndicator(indicator.render());

  assert.equal(root.type, "fieldset");
  assert.match(root.props.className, /\bmb-4\b/);
  assert.match(root.props.className, /max-w-\[440px\]/);
  assert.equal(progress.props["aria-label"], "Task progress · Step 2 of 3 · 1/3 completed · Running");
  assert.deepEqual(
    [progress.props["aria-valuemin"], progress.props["aria-valuenow"], progress.props["aria-valuemax"]],
    [0, 1, 3],
  );
  assert.equal(rows.length, 3);
  assert.equal(buttons.length, 3);
  assert.equal(details.length, 3);
  assert.equal(buttons[0].props["aria-expanded"], false);
  assert.equal(buttons[1].props["aria-expanded"], true);
  assert.equal(buttons[1].props["aria-controls"], details[1].props.id);
  assert.equal(details[0].props["aria-hidden"], true);
  assert.equal(details[1].props["aria-hidden"], false);
  assert.match(rows[1].props.className, /motion-reduce:transition-none/);
  assert.match(details[1].props.className, /motion-reduce:transition-none/);
  assert.match(treeText(root), /Task progress/);
  assert.match(treeText(root), /Implement/);
  assert.match(treeText(root), /Implement completion criteria/);
  assert.doesNotMatch(treeText(root), /Implementing/);
});

test("web keeps task labels stable and scopes the active animation to the step ring", () => {
  const indicator = createIndicatorHarness();
  const runningSnapshot = createSnapshot({
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
  });
  const runningTree = indicator.render({ snapshot: runningSnapshot });
  const runningRow = readIndicator(runningTree).rows[0];
  const stepRing = findAll(
    runningRow,
    (node) => typeof node.type === "function" && node.type.name === "TaskStepRing",
  )[0];

  assert.match(treeText(runningRow), /Stable task/);
  assert.match(treeText(runningRow), /Stable completion criteria/);
  assert.doesNotMatch(treeText(runningRow), /Changing label/);
  assert.equal(runningRow.props["data-task-status"], "in_progress");
  assert.equal(runningRow.props["aria-current"], "step");
  assert.equal(stepRing.props.active, true);
  assert.equal(stepRing.props.paused, false);

  const completedTree = indicator.render({
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
  });
  const completedRow = readIndicator(completedTree).rows[0];
  assert.match(treeText(completedRow), /Stable task/);
  assert.doesNotMatch(treeText(completedRow), /Changed again/);
  assert.equal(completedRow.props["data-task-status"], "completed");
  assert.equal(completedRow.props["aria-current"], undefined);
});

test("web clicks independently toggle row details and expansion resets at the run boundary", () => {
  const indicator = createIndicatorHarness();
  let view = readIndicator(indicator.render());
  assert.deepEqual(
    view.buttons.map((button) => button.props["aria-expanded"]),
    [false, true, false],
  );

  view.buttons[0].props.onClick();
  view = readIndicator(indicator.render());
  assert.deepEqual(
    view.buttons.map((button) => button.props["aria-expanded"]),
    [true, true, false],
  );

  view.buttons[1].props.onClick();
  view = readIndicator(indicator.render());
  assert.deepEqual(
    view.buttons.map((button) => button.props["aria-expanded"]),
    [true, false, false],
  );

  const nextRun = createSnapshot({ runId: "run-2" });
  view = readIndicator(indicator.render({ snapshot: nextRun }));
  assert.deepEqual(
    view.buttons.map((button) => button.props["aria-expanded"]),
    [false, true, false],
  );
});

test("web shows pending, paused, and completed states without auto-dismissing completion", () => {
  const indicator = createIndicatorHarness();
  const pausedView = readIndicator(indicator.render({ isConversationRunning: false }));
  const pausedRing = findAll(
    pausedView.rows[1],
    (node) => typeof node.type === "function" && node.type.name === "TaskStepRing",
  )[0];
  const pendingRing = findAll(
    pausedView.rows[2],
    (node) => typeof node.type === "function" && node.type.name === "TaskStepRing",
  )[0];
  assert.equal(pausedRing.props.active, false);
  assert.equal(pausedRing.props.paused, true);
  assert.equal(pendingRing.props.active, false);
  assert.equal(pendingRing.props.paused, false);

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
  assert.match(treeText(indicator.render({ snapshot: pending })), /Pending/);
  assert.match(
    readIndicator(indicator.render({ snapshot: pending, isConversationRunning: false })).progress
      .props["aria-label"],
    /Paused/,
  );

  const completedTasks = [
    {
      id: "done",
      subject: "Done",
      description: "Done completion criteria",
      status: "completed",
      activeForm: "Finishing",
    },
  ];
  const completed = createSnapshot({
    tasks: completedTasks,
    completedCount: 1,
    totalCount: 1,
    currentStep: 1,
    state: "completed",
  });
  const completedView = readIndicator(indicator.render({ snapshot: completed }));
  assert.match(completedView.progress.props["aria-label"], /All completed/);
  assert.match(treeText(completedView.root), /Completed/);
});

test("web uses the shared localized task progress bar", () => {
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
  const loader = createWebModuleLoader({
    rootDir,
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
