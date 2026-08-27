import {
  AssistantStatus,
  CompactingText,
  VibingText,
} from "@liveagent/ui/components/chat/AssistantStatus";
import { AssistantWorkTrace } from "@liveagent/ui/components/chat/AssistantWorkTrace";
import { HostedSearchGroupView } from "@liveagent/ui/components/chat/HostedSearchGroupView";
import { ThinkingActivity } from "@liveagent/ui/components/chat/ThinkingActivity";
import { Markdown } from "@liveagent/ui/components/Markdown";
import type { UiRound } from "@liveagent/ui/lib/chat/assistantBubbleAdapter";
import { normalizeLiveToolStatus, VIBING_STATUS } from "@liveagent/ui/lib/chat/assistantStatus";
import type { ChatFileLink } from "@liveagent/ui/lib/chat/chatFileLinks";
import { memo, type ReactNode, useMemo } from "react";
import {
  type AssistantTurnLayoutEntry,
  type GroupedRoundBlock,
  isBuiltinShareToolName,
  resolveAssistantTurnLayout,
} from "./assistantBubbleUtils";
import { MemoToolCallItem } from "./ToolCallItem";
import { getNativeDisplayImagePayload, NativeDisplayImageBlock } from "./ToolImages";
import { ToolTraceGroup } from "./ToolTraceGroup";

const EMPTY_RUNNING_TOOL_CALL_IDS: string[] = [];

export const RoundBlockContent = memo(function RoundBlockContent(props: {
  block: GroupedRoundBlock;
  isLive: boolean;
  renderMode: "streaming" | "static";
  runningToolCallIds: string[];
  thinkingOpen: boolean;
  isLatestThinking: boolean;
  collapseThinking?: boolean;
  readOnly?: boolean;
  redactToolContent?: boolean;
  workdir?: string;
  onOpenFileLink?: (link: ChatFileLink) => void;
}) {
  const {
    block,
    isLive,
    renderMode,
    runningToolCallIds,
    thinkingOpen,
    isLatestThinking,
    collapseThinking = false,
    readOnly = false,
    redactToolContent = false,
    workdir,
    onOpenFileLink,
  } = props;

  let content: ReactNode;
  if (block.kind === "thinking") {
    const isRunning = isLive && thinkingOpen && isLatestThinking;
    content = (
      <ThinkingActivity
        text={block.text}
        open={collapseThinking ? false : isRunning || (!isLive && thinkingOpen)}
        isRunning={isRunning}
        renderMode={renderMode}
        workdir={workdir}
        onOpenFileLink={onOpenFileLink}
      />
    );
  } else if (block.kind === "tool") {
    const isRedactedToolContent =
      redactToolContent && isBuiltinShareToolName(block.item.toolCall.name);
    const displayImagePayload = getNativeDisplayImagePayload(block.item);
    if (!isRedactedToolContent && displayImagePayload) {
      content = <NativeDisplayImageBlock payload={displayImagePayload} readOnly={readOnly} />;
    } else if (
      !isRedactedToolContent &&
      block.item.toolCall.name === "Image" &&
      !block.item.toolResult?.isError
    ) {
      content = null;
    } else {
      content = (
        <MemoToolCallItem
          item={block.item}
          isRunning={Boolean(
            isLive && block.item.toolCall.id && runningToolCallIds.includes(block.item.toolCall.id),
          )}
          readOnly={readOnly}
          redactToolContent={redactToolContent}
        />
      );
    }
  } else if (block.kind === "toolGroup") {
    content = (
      <ToolTraceGroup
        items={block.items}
        runningToolCallIds={isLive ? runningToolCallIds : []}
        readOnly={readOnly}
        redactToolContent={redactToolContent}
      />
    );
  } else if (block.kind === "hostedSearch" || block.kind === "hostedSearchGroup") {
    content = (
      <HostedSearchGroupView
        items={block.kind === "hostedSearch" ? [block.item] : block.items}
        isLive={isLive}
        readOnly={readOnly}
      />
    );
  } else if (block.text.trim()) {
    content = (
      <Markdown
        content={block.text}
        className="font-chat"
        renderMode={renderMode}
        readOnly={readOnly}
        workdir={workdir}
        onOpenFileLink={onOpenFileLink}
      />
    );
  } else {
    content = null;
  }

  if (!content) return null;

  return <div className={isLive ? undefined : "w-full"}>{content}</div>;
});

type AssistantTurnRound = UiRound & {
  key?: string;
  runningToolCallIds?: string[];
  thinkingOpen?: boolean;
};

function hasRunningToolCall(entries: AssistantTurnLayoutEntry[]) {
  return entries.some((entry) => {
    const runningIds = new Set(entry.runningToolCallIds);
    if (entry.block.kind === "tool") {
      return Boolean(entry.block.item.toolCall.id && runningIds.has(entry.block.item.toolCall.id));
    }
    if (entry.block.kind === "toolGroup") {
      return entry.block.items.some((item) =>
        Boolean(item.toolCall.id && runningIds.has(item.toolCall.id)),
      );
    }
    return false;
  });
}

export const AssistantTurnContent = memo(function AssistantTurnContent(props: {
  rounds: AssistantTurnRound[];
  isLive?: boolean;
  isStreaming?: boolean;
  toolStatus?: string | null;
  toolStatusVariant?: "default" | "compaction";
  durationMs?: number;
  renderMode?: "streaming" | "static";
  readOnly?: boolean;
  redactToolContent?: boolean;
  workdir?: string;
  onOpenFileLink?: (link: ChatFileLink) => void;
}) {
  const {
    rounds,
    isLive = false,
    isStreaming = isLive,
    toolStatus,
    toolStatusVariant,
    durationMs,
    renderMode = isStreaming ? "streaming" : "static",
    readOnly = false,
    redactToolContent = false,
    workdir,
    onOpenFileLink,
  } = props;
  const layout = useMemo(
    () => resolveAssistantTurnLayout(rounds, { live: isLive }),
    [isLive, rounds],
  );
  const running = Boolean(isLive && isStreaming);
  const normalizedToolStatus = running ? normalizeLiveToolStatus(toolStatus ?? null) : null;
  const isCompactionStatus = toolStatusVariant === "compaction";
  const isVibingStatus = normalizedToolStatus === VIBING_STATUS;
  const showDetailedStatus = Boolean(
    normalizedToolStatus &&
      (isCompactionStatus || isVibingStatus) &&
      !hasRunningToolCall(layout.work),
  );
  const latestThinkingKey = useMemo(() => {
    for (let index = layout.work.length - 1; index >= 0; index -= 1) {
      const entry = layout.work[index];
      if (entry?.block.kind === "thinking") return entry.key;
    }
    return null;
  }, [layout.work]);
  const showWorkTrace = running || layout.work.length > 0;

  if (!showWorkTrace && layout.answer.length === 0) return null;

  const renderEntry = (entry: AssistantTurnLayoutEntry, insideWorkTrace: boolean) => (
    <RoundBlockContent
      key={entry.key}
      block={entry.block}
      isLive={insideWorkTrace && running}
      renderMode={renderMode}
      runningToolCallIds={entry.runningToolCallIds}
      thinkingOpen={insideWorkTrace ? (running ? entry.thinkingOpen : true) : false}
      isLatestThinking={insideWorkTrace && entry.key === latestThinkingKey}
      collapseThinking={insideWorkTrace}
      readOnly={readOnly}
      redactToolContent={redactToolContent}
      workdir={workdir}
      onOpenFileLink={onOpenFileLink}
    />
  );

  return (
    <div className="space-y-2">
      {showWorkTrace ? (
        <AssistantWorkTrace
          durationMs={durationMs}
          hasDetails={layout.work.length > 0 || showDetailedStatus}
          running={running}
        >
          {layout.work.map((entry) => renderEntry(entry, true))}
          {showDetailedStatus ? (
            <div className="py-1.5">
              {isCompactionStatus ? (
                <CompactingText />
              ) : isVibingStatus ? (
                <VibingText />
              ) : (
                <AssistantStatus>{normalizedToolStatus}</AssistantStatus>
              )}
            </div>
          ) : null}
        </AssistantWorkTrace>
      ) : null}

      {layout.answer.map((entry) => renderEntry(entry, false))}
    </div>
  );
});

export const RoundContent = memo(function RoundContent(props: {
  round: UiRound;
  isLive?: boolean;
  isStreaming?: boolean;
  isActive?: boolean;
  toolStatus?: string | null;
  toolStatusVariant?: "default" | "compaction";
  durationMs?: number;
  runningToolCallIds?: string[];
  thinkingOpen?: boolean;
  renderMode?: "streaming" | "static";
  readOnly?: boolean;
  redactToolContent?: boolean;
  workdir?: string;
  onOpenFileLink?: (link: ChatFileLink) => void;
}) {
  const {
    round,
    isLive,
    isStreaming = isLive,
    isActive,
    toolStatus,
    toolStatusVariant,
    durationMs,
    runningToolCallIds,
    thinkingOpen,
    renderMode,
    readOnly = false,
    redactToolContent = false,
    workdir,
    onOpenFileLink,
  } = props;
  const activeLive = Boolean(isLive && (isActive ?? true));
  const decoratedRound = useMemo<AssistantTurnRound>(
    () => ({
      ...round,
      runningToolCallIds: runningToolCallIds ?? EMPTY_RUNNING_TOOL_CALL_IDS,
      thinkingOpen: thinkingOpen ?? false,
    }),
    [round, runningToolCallIds, thinkingOpen],
  );
  const rounds = useMemo(() => [decoratedRound], [decoratedRound]);

  return (
    <AssistantTurnContent
      rounds={rounds}
      isLive={activeLive}
      isStreaming={isStreaming}
      toolStatus={toolStatus}
      toolStatusVariant={toolStatusVariant}
      durationMs={durationMs}
      renderMode={renderMode}
      readOnly={readOnly}
      redactToolContent={redactToolContent}
      workdir={workdir}
      onOpenFileLink={onOpenFileLink}
    />
  );
});
