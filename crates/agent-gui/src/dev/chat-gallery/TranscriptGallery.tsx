import type { AssistantMessage, Message, ToolResultMessage } from "@liveagent/app/lib/agentTypes";
import type { ScrollFollowHandle } from "@liveagent/ui/lib/chat-scroll/useScrollFollow";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { flushSync } from "react-dom";
import type { Locale } from "../../i18n/config";
import {
  createTranscriptProjection,
  type StoredSummaryMessage,
} from "../../lib/chat/conversation/conversationState";
import { createLiveTranscriptStore } from "../../lib/chat/conversation/liveTranscriptStore";
import { ChatTranscript } from "../../pages/chat/transcript/ChatTranscript";
import { GalleryComposerHarness } from "./ComposerGallery";
import { type ChatGalleryFixtureId, createChatGalleryFixture } from "./fixtures";
import { createChatGalleryReplayController } from "./replay";
import type { ChatGalleryScenarioId } from "./scenarios";

const REPLAY_STARTED_AT = Date.UTC(2026, 0, 15, 14, 0, 0);

const REPLAY_USER_MESSAGE = {
  role: "user",
  id: "chat-gallery-replay-user",
  content: "请先读取项目配置，再说明这个 UI 展厅会不会执行真实工具。",
  timestamp: REPLAY_STARTED_AT,
} as Message;

const REPLAY_FINAL_MESSAGES: Message[] = [
  {
    role: "assistant",
    id: "chat-gallery-replay-assistant-1",
    responseId: "chat-gallery-replay-assistant-1",
    provider: "gallery",
    model: "gallery-model",
    api: "gallery",
    stopReason: "toolUse",
    timestamp: REPLAY_STARTED_AT + 1_000,
    content: [
      { type: "thinking", thinking: "我需要先确认项目结构，再给出可以直接运行的方案。" },
      { type: "text", text: "我先读取项目配置，确认现有的启动方式。" },
      {
        type: "toolCall",
        id: "chat-gallery-read-package",
        name: "Read",
        arguments: { path: "/workspace/package.json" },
      },
    ],
    usage: {
      input: 840,
      output: 96,
      cacheRead: 0,
      cacheWrite: 0,
      totalTokens: 936,
      cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
    },
  } as AssistantMessage,
  {
    role: "toolResult",
    id: "chat-gallery-replay-tool-result",
    toolCallId: "chat-gallery-read-package",
    toolName: "Read",
    content: [
      {
        type: "text",
        text: '{\n  "name": "liveagent",\n  "scripts": { "dev": "vite" }\n}',
      },
    ],
    isError: false,
    details: {
      kind: "read_text",
      path: "/workspace/package.json",
      displayPath: "package.json",
      content: '{\n  "name": "liveagent",\n  "scripts": { "dev": "vite" }\n}',
      totalLines: 4,
    },
    timestamp: REPLAY_STARTED_AT + 2_000,
  } as ToolResultMessage,
  {
    role: "assistant",
    id: "chat-gallery-replay-assistant-2",
    responseId: "chat-gallery-replay-assistant-2",
    provider: "gallery",
    model: "gallery-model",
    api: "gallery",
    stopReason: "stop",
    timestamp: REPLAY_STARTED_AT + 3_000,
    content: [
      {
        type: "text",
        text: "配置已经确认。这个展示页只驱动前端 transcript store，不会请求模型或执行真实工具。",
      },
    ],
    usage: {
      input: 1_180,
      output: 138,
      cacheRead: 760,
      cacheWrite: 0,
      totalTokens: 1_318,
      cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
    },
  } as AssistantMessage,
];

function projectMessages(params: {
  key: string;
  messages: Message[];
  summary?: StoredSummaryMessage;
}) {
  const { key, messages, summary } = params;
  const firstTimestamp = messages[0]?.timestamp ?? REPLAY_STARTED_AT;
  const lastTimestamp = messages.at(-1)?.timestamp ?? firstTimestamp;
  return createTranscriptProjection({
    segments: [
      {
        segmentIndex: 0,
        segmentId: `chat-gallery-${key}`,
        messages,
        startMessageIndex: 0,
        createdAt: firstTimestamp,
        updatedAt: lastTimestamp,
        ...(summary ? { summary } : {}),
      },
    ],
    activeSegmentIndex: 0,
    oldestMessageOffset: 0,
    hasMoreBefore: false,
    revision: `gallery-${key}`,
  });
}

function TranscriptStage(props: {
  scenarioKey: string;
  messages: Message[];
  summary?: StoredSummaryMessage;
  liveTranscriptStore: ReturnType<typeof createLiveTranscriptStore>;
  hasModels?: boolean;
  isSending?: boolean;
  isHistorySwitching?: boolean;
  locale: Locale;
}) {
  const {
    scenarioKey,
    messages,
    summary,
    liveTranscriptStore,
    hasModels = true,
    isSending = false,
    isHistorySwitching = false,
    locale,
  } = props;
  const followRef = useRef<ScrollFollowHandle | null>(null);
  const [contentWidth, setContentWidth] = useState(768);
  const [composerOverlayHeight, setComposerOverlayHeight] = useState(0);
  const [notice, setNotice] = useState("");
  const projection = useMemo(
    () => projectMessages({ key: scenarioKey, messages, summary }),
    [messages, scenarioKey, summary],
  );
  const zh = locale === "zh-CN";

  return (
    <div className="chat-gallery-transcript-stage">
      <ChatTranscript
        conversationId={`chat-gallery-${scenarioKey}`}
        workspaceRoot="/workspace/liveagent"
        gitClient={null}
        followRef={followRef}
        hasModels={hasModels}
        historyItems={projection.items}
        hasMoreHistory={false}
        onLoadEarlierHistory={async () => undefined}
        isHistorySwitching={isHistorySwitching}
        isSending={isSending}
        isAgentMode
        showUsage
        usageContextWindow={128_000}
        liveTranscriptStore={liveTranscriptStore}
        isCompactionRunning={false}
        bottomReservePx={composerOverlayHeight}
        contentWidth={contentWidth}
        onContentWidthChange={setContentWidth}
        onOpenFileLink={(link) => {
          setNotice(`${zh ? "模拟打开" : "Mock open"}: ${link.path}`);
        }}
        onResendFromEdit={(_messageRef, text) => {
          setNotice(`${zh ? "模拟重新发送" : "Mock resend"}: ${text.slice(0, 48)}`);
        }}
        onBranchConversation={() => {
          setNotice(
            zh ? "已模拟创建分支；没有写入聊天历史" : "Branch simulated; history unchanged",
          );
        }}
        onOpenSettings={() => {
          setNotice(
            zh ? "设置入口已触发（展厅内不打开真实设置）" : "Settings action captured locally",
          );
        }}
        onSuggestionSelect={(text) => {
          setNotice(`${zh ? "建议词" : "Suggestion"}: ${text}`);
        }}
      />
      <GalleryComposerHarness
        variant="empty"
        locale={locale}
        embedded
        conversationId={`chat-gallery-${scenarioKey}`}
        hasModels={hasModels}
        {...(isSending ? { isSending: true } : {})}
        onHeightChange={setComposerOverlayHeight}
      />
      <p className="chat-gallery-sr-only" aria-live="polite">
        {notice}
      </p>
    </div>
  );
}

function StaticTranscriptScenario(props: {
  fixtureId: ChatGalleryFixtureId;
  scenarioKey: string;
  locale: Locale;
  includeFileOperations?: boolean;
  isHistorySwitching?: boolean;
}) {
  const { fixtureId, scenarioKey, locale, includeFileOperations, isHistorySwitching } = props;
  const fixture = useMemo(() => {
    const base = createChatGalleryFixture(fixtureId);
    if (!includeFileOperations) return base;
    const fileOperations = createChatGalleryFixture("fileOperations");
    return { ...base, messages: [...base.messages, ...fileOperations.messages] };
  }, [fixtureId, includeFileOperations]);
  const [store] = useState(() => createLiveTranscriptStore());
  return (
    <TranscriptStage
      scenarioKey={scenarioKey}
      messages={fixture.messages}
      summary={fixture.summary}
      liveTranscriptStore={store}
      isHistorySwitching={isHistorySwitching}
      locale={locale}
    />
  );
}

function EmptyTranscriptScenario(props: { hasModels: boolean; locale: Locale }) {
  const { hasModels, locale } = props;
  const [store] = useState(() => createLiveTranscriptStore());
  return (
    <TranscriptStage
      scenarioKey={hasModels ? "empty-start" : "empty-no-model"}
      messages={[]}
      liveTranscriptStore={store}
      hasModels={hasModels}
      locale={locale}
    />
  );
}

function StreamingTranscriptScenario({ locale }: { locale: Locale }) {
  const [messages, setMessages] = useState<Message[]>([structuredClone(REPLAY_USER_MESSAGE)]);
  const [store] = useState(() => createLiveTranscriptStore());
  const [controller] = useState(() =>
    createChatGalleryReplayController({
      store,
      initialSpeed: 1,
      onCommit: async (_state) => {
        flushSync(() => {
          setMessages((current) => [...current, ...structuredClone(REPLAY_FINAL_MESSAGES)]);
        });
      },
    }),
  );
  const replay = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    controller.getSnapshot,
  );
  const zh = locale === "zh-CN";

  useEffect(() => {
    controller.play();
    return () => controller.dispose();
  }, [controller]);

  const resetHistory = () => {
    flushSync(() => setMessages([structuredClone(REPLAY_USER_MESSAGE)]));
  };
  const play = () => {
    if (replay.phase === "complete") resetHistory();
    controller.play();
  };
  const step = async () => {
    if (replay.phase === "complete") resetHistory();
    await controller.step();
  };
  const reset = () => {
    resetHistory();
    controller.reset();
  };

  return (
    <div className="chat-gallery-transcript-stage">
      <div className="flex min-h-11 shrink-0 flex-wrap items-center gap-2 border-b border-border/60 bg-muted/25 px-3 py-2 text-xs">
        <span className="chat-gallery-badge" data-tone={replay.isSending ? "running" : "success"}>
          {replay.phase}
        </span>
        <span className="text-muted-foreground tabular-nums">
          {replay.stepIndex} / {replay.stepCount}
          {replay.currentStepId ? ` · ${replay.currentStepId}` : ""}
        </span>
        <div className="ml-auto flex items-center gap-1.5">
          {replay.phase === "playing" ? (
            <button type="button" className="chat-gallery-button" onClick={controller.pause}>
              {zh ? "暂停" : "Pause"}
            </button>
          ) : (
            <button type="button" className="chat-gallery-button" onClick={play}>
              {zh ? "播放" : "Play"}
            </button>
          )}
          <button
            type="button"
            className="chat-gallery-button"
            disabled={replay.phase === "committing"}
            onClick={() => void step()}
          >
            {zh ? "单步" : "Step"}
          </button>
          <button type="button" className="chat-gallery-button" onClick={reset}>
            {zh ? "重置" : "Reset"}
          </button>
          <label className="chat-gallery-control-group">
            <span className="chat-gallery-control-label">{zh ? "速度" : "Speed"}</span>
            <select
              className="chat-gallery-select"
              value={replay.speed}
              onChange={(event) => controller.setSpeed(Number(event.target.value))}
            >
              <option value={0.5}>0.5×</option>
              <option value={1}>1×</option>
              <option value={2}>2×</option>
              <option value={4}>4×</option>
            </select>
          </label>
        </div>
      </div>
      <div className="min-h-0 flex-1">
        <TranscriptStage
          scenarioKey="streaming-run"
          messages={messages}
          liveTranscriptStore={store}
          isSending={replay.isSending}
          locale={locale}
        />
      </div>
    </div>
  );
}

export function TranscriptGallery(props: { scenarioId: ChatGalleryScenarioId; locale: Locale }) {
  const { scenarioId, locale } = props;
  if (scenarioId === "streaming-run") return <StreamingTranscriptScenario locale={locale} />;
  if (scenarioId === "empty-start") return <EmptyTranscriptScenario hasModels locale={locale} />;
  if (scenarioId === "empty-no-model") {
    return <EmptyTranscriptScenario hasModels={false} locale={locale} />;
  }
  if (scenarioId === "history-loading") {
    return (
      <StaticTranscriptScenario
        fixtureId="richContent"
        scenarioKey={scenarioId}
        locale={locale}
        isHistorySwitching
      />
    );
  }
  if (scenarioId === "rich-content") {
    return (
      <StaticTranscriptScenario fixtureId="richContent" scenarioKey={scenarioId} locale={locale} />
    );
  }
  if (scenarioId === "liveagent-overview") {
    return (
      <StaticTranscriptScenario
        fixtureId="liveAgentOverview"
        scenarioKey={scenarioId}
        locale={locale}
      />
    );
  }
  if (scenarioId === "user-attachments") {
    return (
      <StaticTranscriptScenario fixtureId="attachments" scenarioKey={scenarioId} locale={locale} />
    );
  }
  if (scenarioId === "thinking-search") {
    return (
      <StaticTranscriptScenario
        fixtureId="thinkingAndSearch"
        scenarioKey={scenarioId}
        locale={locale}
      />
    );
  }
  if (scenarioId === "tool-results") {
    return (
      <StaticTranscriptScenario
        fixtureId="toolStates"
        scenarioKey={scenarioId}
        locale={locale}
        includeFileOperations
      />
    );
  }
  if (scenarioId === "history-decisions") {
    return (
      <StaticTranscriptScenario
        fixtureId="interactiveDecisions"
        scenarioKey={scenarioId}
        locale={locale}
      />
    );
  }
  if (scenarioId === "compaction-summary") {
    return (
      <StaticTranscriptScenario fixtureId="compaction" scenarioKey={scenarioId} locale={locale} />
    );
  }
  if (scenarioId === "error-abort") {
    return (
      <StaticTranscriptScenario
        fixtureId="errorAndAbort"
        scenarioKey={scenarioId}
        locale={locale}
      />
    );
  }
  return (
    <StaticTranscriptScenario fixtureId="kitchenSink" scenarioKey={scenarioId} locale={locale} />
  );
}
