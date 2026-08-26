import {
  AssistantStatus,
  CompactingText,
  VibingText,
} from "@liveagent/ui/components/chat/AssistantStatus";
import { HostedSearchGroupView } from "@liveagent/ui/components/chat/HostedSearchGroupView";
import { ThinkingActivity } from "@liveagent/ui/components/chat/ThinkingActivity";
import { Markdown } from "@liveagent/ui/components/Markdown";
import type { UiRound } from "@liveagent/ui/lib/chat/assistantBubbleAdapter";
import { normalizeLiveToolStatus, VIBING_STATUS } from "@liveagent/ui/lib/chat/assistantStatus";
import type { ChatFileLink } from "@liveagent/ui/lib/chat/chatFileLinks";
import { isTaskToolBlock } from "@liveagent/ui/lib/chat/taskProgress";
import { memo, type ReactNode, useMemo } from "react";
import {
  type GroupedRoundBlock,
  groupRoundBlocks,
  isBuiltinShareToolName,
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
        open={isRunning || (!isLive && thinkingOpen)}
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
          readOnly={readOnly}
          redactToolContent={redactToolContent}
          isRunning={Boolean(
            isLive && block.item.toolCall.id && runningToolCallIds.includes(block.item.toolCall.id),
          )}
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

type ReplyRound = UiRound & {
  key?: string;
  runningToolCallIds?: string[];
  thinkingOpen?: boolean;
};

export const AssistantReplyContent = memo(function AssistantReplyContent(props: {
  rounds: ReplyRound[];
  isLive?: boolean;
  isStreaming?: boolean;
  toolStatus?: string | null;
  toolStatusVariant?: "default" | "compaction";
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
    renderMode = isStreaming ? "streaming" : "static",
    readOnly = false,
    redactToolContent = false,
    workdir,
    onOpenFileLink,
  } = props;
  const replyBlocks = useMemo(
    () =>
      rounds.flatMap((round, roundIndex) => {
        const roundKey = round.key || `r${round.round || roundIndex + 1}`;
        const runningToolCallIds = round.runningToolCallIds ?? EMPTY_RUNNING_TOOL_CALL_IDS;
        return groupRoundBlocks(round.blocks)
          .filter((block) => !isTaskToolBlock(block))
          .filter((block) => {
            if (block.kind === "text" || block.kind === "thinking") {
              return block.text.trim().length > 0;
            }
            return true;
          })
          .map((block) => ({
            block,
            key: `${roundKey}:${block.key}`,
            runningToolCallIds,
            thinkingOpen: round.thinkingOpen ?? false,
          }));
      }),
    [rounds],
  );
  const normalizedToolStatus = isLive ? normalizeLiveToolStatus(toolStatus ?? null) : null;
  const isCompactionStatus = toolStatusVariant === "compaction";
  const isVibingStatus = normalizedToolStatus === VIBING_STATUS;
  const hasRunningToolCall = replyBlocks.some((entry) => {
    const runningIds = new Set(entry.runningToolCallIds);
    const { block } = entry;
    if (block.kind === "tool") {
      return Boolean(block.item.toolCall.id && runningIds.has(block.item.toolCall.id));
    }
    if (block.kind === "toolGroup") {
      return block.items.some((item) =>
        Boolean(item.toolCall.id && runningIds.has(item.toolCall.id)),
      );
    }
    return false;
  });
  let latestThinkingKey: string | null = null;
  for (let index = replyBlocks.length - 1; index >= 0; index -= 1) {
    const entry = replyBlocks[index];
    if (entry?.block.kind === "thinking") {
      latestThinkingKey = entry.key;
      break;
    }
  }
  if (replyBlocks.length === 0 && !isLive) return null;

  return (
    <div className="space-y-2">
      {isLive &&
      normalizedToolStatus &&
      (!hasRunningToolCall || isCompactionStatus || isVibingStatus) ? (
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

      {replyBlocks.map((entry) => (
        <RoundBlockContent
          key={entry.key}
          block={entry.block}
          isLive={isLive}
          renderMode={renderMode}
          runningToolCallIds={entry.runningToolCallIds}
          thinkingOpen={entry.thinkingOpen}
          isLatestThinking={entry.key === latestThinkingKey}
          readOnly={readOnly}
          redactToolContent={redactToolContent}
          workdir={workdir}
          onOpenFileLink={onOpenFileLink}
        />
      ))}
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
    runningToolCallIds,
    thinkingOpen,
    renderMode,
    readOnly = false,
    redactToolContent = false,
    workdir,
    onOpenFileLink,
  } = props;
  return (
    <AssistantReplyContent
      rounds={[
        {
          ...round,
          key: `r${round.round}`,
          runningToolCallIds: runningToolCallIds ?? EMPTY_RUNNING_TOOL_CALL_IDS,
          thinkingOpen: thinkingOpen ?? false,
        },
      ]}
      isLive={Boolean(isLive && isActive !== false)}
      isStreaming={isStreaming}
      toolStatus={toolStatus}
      toolStatusVariant={toolStatusVariant}
      renderMode={renderMode}
      readOnly={readOnly}
      redactToolContent={redactToolContent}
      workdir={workdir}
      onOpenFileLink={onOpenFileLink}
    />
  );
});
