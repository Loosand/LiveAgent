import type { ToolCall, ToolResultMessage } from "@earendil-works/pi-ai";
import type {
  LiveTranscriptState,
  LiveTranscriptStore,
} from "../../lib/chat/conversation/liveTranscriptStore";
import {
  appendTextDeltaToRound,
  appendThinkingDeltaToRound,
  attachToolResultToRound,
  collapseThinking,
  type LiveRound,
  markToolCallRunningInRound,
  updateLiveRound,
  upsertToolCallToRound,
} from "../../lib/chat/messages/uiMessages";

export type ChatGalleryReplayPhase =
  | "idle"
  | "playing"
  | "paused"
  | "committing"
  | "complete"
  | "error";

export type ChatGalleryReplayStepId =
  | "round-start"
  | "thinking-1"
  | "thinking-2"
  | "assistant-token-1"
  | "assistant-token-2"
  | "tool-waiting"
  | "tool-running"
  | "tool-success"
  | "next-round"
  | "retry"
  | "retry-recovered"
  | "final-token-1"
  | "final-token-2"
  | "commit";

export type ChatGalleryReplaySnapshot = {
  phase: ChatGalleryReplayPhase;
  /** Number of already-applied replay steps. */
  stepIndex: number;
  stepCount: number;
  currentStepId: ChatGalleryReplayStepId | null;
  speed: number;
  /** Keep the transcript live while a manually-stepped replay is paused. */
  isSending: boolean;
  error: string | null;
};

export type ChatGalleryReplayCommit = (state: LiveTranscriptState) => void | Promise<void>;

export type CreateChatGalleryReplayControllerOptions = {
  store: LiveTranscriptStore;
  /**
   * Append the final assistant history item here. The callback always completes
   * before the controller settles the live store, preserving the transcript's
   * live-to-history handoff order.
   */
  onCommit: ChatGalleryReplayCommit;
  initialSpeed?: number;
};

export type ChatGalleryReplayController = {
  getSnapshot: () => ChatGalleryReplaySnapshot;
  subscribe: (listener: () => void) => () => void;
  play: () => void;
  pause: () => void;
  step: () => Promise<void>;
  reset: () => void;
  setSpeed: (speed: number) => void;
  dispose: () => void;
};

type ReplayStep = {
  id: ChatGalleryReplayStepId;
  delayMs: number;
  apply: (store: LiveTranscriptStore) => void;
};

const DEFAULT_SPEED = 1;
const TOOL_CALL_ID = "chat-gallery-read-package";
const FIRST_ROUND = 1;
const SECOND_ROUND = 2;

const MOCK_TOOL_CALL = {
  type: "toolCall",
  id: TOOL_CALL_ID,
  name: "Read",
  arguments: { path: "/workspace/package.json" },
} satisfies ToolCall;

const MOCK_TOOL_RESULT = {
  role: "toolResult",
  toolCallId: TOOL_CALL_ID,
  toolName: MOCK_TOOL_CALL.name,
  content: [
    {
      type: "text",
      text: '{\n  "name": "liveagent",\n  "scripts": { "dev": "vite" }\n}',
    },
  ],
  isError: false,
  timestamp: 1_700_000_000_000,
} satisfies ToolResultMessage;

function createEmptyRound(round: number): LiveRound {
  return {
    key: `r${round}`,
    round,
    blocks: [],
    runningToolCallIds: [],
    thinkingOpen: false,
  };
}

function updateRound(
  store: LiveTranscriptStore,
  round: number,
  updater: (target: LiveRound) => LiveRound,
) {
  store.updateLiveRounds((previous) => updateLiveRound(previous, round, updater));
}

const REPLAY_STEPS: readonly ReplayStep[] = [
  {
    id: "round-start",
    delayMs: 0,
    apply: (store) => {
      store.updateLiveRounds(() => [createEmptyRound(FIRST_ROUND)]);
      store.setToolStatus("第 1 轮：模型生成中...");
    },
  },
  {
    id: "thinking-1",
    delayMs: 460,
    apply: (store) => {
      updateRound(store, FIRST_ROUND, (target) => ({
        ...appendThinkingDeltaToRound(target, "我需要先确认项目结构，"),
        thinkingOpen: true,
      }));
    },
  },
  {
    id: "thinking-2",
    delayMs: 360,
    apply: (store) => {
      updateRound(store, FIRST_ROUND, (target) => ({
        ...appendThinkingDeltaToRound(target, "再给出可以直接运行的方案。"),
        thinkingOpen: true,
      }));
    },
  },
  {
    id: "assistant-token-1",
    delayMs: 520,
    apply: (store) => {
      updateRound(store, FIRST_ROUND, (target) =>
        appendTextDeltaToRound(collapseThinking(target), "我先读取项目配置，"),
      );
    },
  },
  {
    id: "assistant-token-2",
    delayMs: 260,
    apply: (store) => {
      updateRound(store, FIRST_ROUND, (target) =>
        appendTextDeltaToRound(target, "确认现有的启动方式。"),
      );
    },
  },
  {
    id: "tool-waiting",
    delayMs: 500,
    apply: (store) => {
      updateRound(store, FIRST_ROUND, (target) =>
        upsertToolCallToRound(collapseThinking(target), MOCK_TOOL_CALL),
      );
      store.setToolStatus("第 1 轮：准备执行 1 个工具...");
    },
  },
  {
    id: "tool-running",
    delayMs: 650,
    apply: (store) => {
      updateRound(store, FIRST_ROUND, (target) =>
        markToolCallRunningInRound(target, MOCK_TOOL_CALL),
      );
      store.setToolStatus("正在执行：读取 /workspace/package.json");
    },
  },
  {
    id: "tool-success",
    delayMs: 900,
    apply: (store) => {
      updateRound(store, FIRST_ROUND, (target) => {
        const next = attachToolResultToRound(
          collapseThinking(target),
          MOCK_TOOL_CALL,
          MOCK_TOOL_RESULT,
        );
        return {
          ...next,
          runningToolCallIds: next.runningToolCallIds.filter((id) => id !== TOOL_CALL_ID),
        };
      });
      store.setToolStatus(null);
    },
  },
  {
    id: "next-round",
    delayMs: 620,
    apply: (store) => {
      store.updateLiveRounds((previous) => [...previous, createEmptyRound(SECOND_ROUND)]);
      store.setRetryAttempts([]);
      store.setToolStatus("第 2 轮：模型生成中...");
    },
  },
  {
    id: "retry",
    delayMs: 720,
    apply: (store) => {
      store.setRetryAttempts([
        {
          attempt: 1,
          maxAttempts: 3,
          errorMessage: "Connection closed before the response completed",
        },
      ]);
      store.setToolStatus("第 2 轮：连接已断开，正在重试 (1/3)...");
    },
  },
  {
    id: "retry-recovered",
    delayMs: 1_000,
    apply: (store) => {
      store.setToolStatus("第 2 轮：模型生成中...");
    },
  },
  {
    id: "final-token-1",
    delayMs: 480,
    apply: (store) => {
      updateRound(store, SECOND_ROUND, (target) =>
        appendTextDeltaToRound(target, "配置已经确认。"),
      );
    },
  },
  {
    id: "final-token-2",
    delayMs: 320,
    apply: (store) => {
      updateRound(store, SECOND_ROUND, (target) =>
        appendTextDeltaToRound(
          target,
          "这个展示页只驱动前端 transcript store，不会请求模型或执行真实工具。",
        ),
      );
      store.setToolStatus(null);
    },
  },
  {
    id: "commit",
    delayMs: 700,
    apply: () => undefined,
  },
];

function normalizeSpeed(speed: number) {
  if (!Number.isFinite(speed) || speed <= 0) {
    throw new RangeError("Replay speed must be a finite number greater than zero.");
  }
  return speed;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export function createChatGalleryReplayController(
  options: CreateChatGalleryReplayControllerOptions,
): ChatGalleryReplayController {
  const { store, onCommit } = options;
  const listeners = new Set<() => void>();
  let speed = normalizeSpeed(options.initialSpeed ?? DEFAULT_SPEED);
  let phase: ChatGalleryReplayPhase = "idle";
  let stepIndex = 0;
  let currentStepId: ChatGalleryReplayStepId | null = null;
  let replayError: string | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pendingStep: Promise<void> | null = null;
  let epoch = 0;
  let disposed = false;
  let snapshot: ChatGalleryReplaySnapshot;

  const buildSnapshot = (): ChatGalleryReplaySnapshot => ({
    phase,
    stepIndex,
    stepCount: REPLAY_STEPS.length,
    currentStepId,
    speed,
    isSending: stepIndex > 0 && phase !== "idle" && phase !== "complete",
    error: replayError,
  });

  snapshot = buildSnapshot();

  const emit = () => {
    snapshot = buildSnapshot();
    listeners.forEach((listener) => {
      listener();
    });
  };

  const clearTimer = () => {
    if (timer === null) return;
    clearTimeout(timer);
    timer = null;
  };

  const scheduleNext = (delayMs: number) => {
    clearTimer();
    if (disposed || phase !== "playing") return;
    timer = setTimeout(
      () => {
        timer = null;
        void advance(true);
      },
      Math.max(0, delayMs / speed),
    );
  };

  const finishCommit = async (runEpoch: number) => {
    phase = "committing";
    emit();
    try {
      await onCommit(store.getSnapshot());
      if (disposed || runEpoch !== epoch) return;
      // The host has exposed the committed history twin; hiding the live tail
      // now lets rowModel adopt it without a flash or remount.
      store.settle();
      stepIndex = REPLAY_STEPS.length;
      currentStepId = "commit";
      phase = "complete";
      replayError = null;
      emit();
    } catch (error) {
      if (disposed || runEpoch !== epoch) return;
      phase = "error";
      replayError = errorMessage(error);
      emit();
    }
  };

  async function advance(fromPlayback: boolean): Promise<void> {
    if (disposed) return;
    if (pendingStep) return pendingStep;
    if (stepIndex >= REPLAY_STEPS.length) return;

    const runEpoch = epoch;
    const step = REPLAY_STEPS[stepIndex];
    const operation = (async () => {
      currentStepId = step.id;
      replayError = null;
      if (step.id === "commit") {
        await finishCommit(runEpoch);
        return;
      }

      step.apply(store);
      if (disposed || runEpoch !== epoch) return;
      stepIndex += 1;
      phase = fromPlayback ? "playing" : "paused";
      emit();
    })().finally(() => {
      if (pendingStep === operation) pendingStep = null;
      if (disposed || runEpoch !== epoch || phase !== "playing") return;
      const nextStep = REPLAY_STEPS[stepIndex];
      if (nextStep) scheduleNext(nextStep.delayMs);
    });
    pendingStep = operation;
    return operation;
  }

  const reset = () => {
    if (disposed) return;
    clearTimer();
    epoch += 1;
    pendingStep = null;
    phase = "idle";
    stepIndex = 0;
    currentStepId = null;
    replayError = null;
    store.reset();
    emit();
  };

  const play = () => {
    if (disposed || phase === "playing" || phase === "committing") return;
    if (phase === "complete") reset();
    phase = "playing";
    replayError = null;
    emit();
    const nextStep = REPLAY_STEPS[stepIndex];
    if (nextStep) scheduleNext(stepIndex === 0 ? 0 : nextStep.delayMs);
  };

  const pause = () => {
    if (disposed || phase !== "playing") return;
    clearTimer();
    phase = stepIndex === 0 ? "idle" : "paused";
    emit();
  };

  const step = async () => {
    if (disposed || phase === "committing") return;
    clearTimer();
    if (phase === "complete") reset();
    await advance(false);
  };

  const setSpeed = (nextSpeed: number) => {
    if (disposed) return;
    speed = normalizeSpeed(nextSpeed);
    emit();
    if (phase !== "playing") return;
    const nextStep = REPLAY_STEPS[stepIndex];
    if (nextStep) scheduleNext(nextStep.delayMs);
  };

  const dispose = () => {
    if (disposed) return;
    disposed = true;
    epoch += 1;
    clearTimer();
    pendingStep = null;
    listeners.clear();
  };

  reset();

  return {
    getSnapshot: () => snapshot,
    subscribe: (listener) => {
      if (disposed) return () => undefined;
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    play,
    pause,
    step,
    reset,
    setSpeed,
    dispose,
  };
}
