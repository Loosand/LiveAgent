import { AssistantAvatar } from "@liveagent/ui/components/chat/AssistantAvatar";
import { LiveAssistantStatus } from "@liveagent/ui/components/chat/AssistantStatus";
import { AssistantWorkTrace } from "@liveagent/ui/components/chat/AssistantWorkTrace";
import { RoundBlockContent } from "@liveagent/ui/components/chat/assistant-bubble/RoundContent";
import { RetryDetailsBlock } from "@liveagent/ui/components/chat/RetryDetailsBlock";
import { ThinkingActivity } from "@liveagent/ui/components/chat/ThinkingActivity";
import type { ChatFileLink } from "@liveagent/ui/lib/chat/chatFileLinks";
import { cn } from "@liveagent/ui/lib/shared/utils";
import { memo } from "react";
import type { RetryAttemptRecord } from "../../../lib/chat/conversation/liveTranscriptStore";
import type { AssistantUnitRow } from "../transcript/rowModel";

export { AssistantAvatar } from "@liveagent/ui/components/chat/AssistantAvatar";

export const AssistantBubbleUnit = memo(function AssistantBubbleUnit(props: {
  row: AssistantUnitRow;
  isAgentMode: boolean;
  isCompactionRunning: boolean;
  toolStatus: string | null;
  retryAttempts?: RetryAttemptRecord[];
  workdir?: string;
  onOpenFileLink?: (link: ChatFileLink) => void;
}) {
  const {
    row,
    isAgentMode,
    isCompactionRunning,
    toolStatus,
    retryAttempts,
    workdir,
    onOpenFileLink,
  } = props;
  const { unit } = row;
  if (unit.kind === "footer") return null;
  const workTraceDetailEntries =
    unit.kind === "work-trace"
      ? unit.entries.filter((entry) => entry.block.kind !== "thinking")
      : [];

  // 只有仍在直播的状态单元才渲染转圈状态行。落定交接阶段的同一单元
  // (live:false) 若继续渲染，会在底部留下一个永远旋转的 spinner——运行早已
  // 结束，用户却以为任务还在后台跑。
  const status =
    unit.kind === "status" && row.live ? (
      <LiveAssistantStatus
        status={toolStatus}
        isCompaction={isCompactionRunning}
        className="w-full"
      />
    ) : null;

  return (
    <div className="flex w-full max-w-full items-start gap-3">
      {row.showAvatar ? (
        <AssistantAvatar />
      ) : (
        <div aria-hidden="true" className="h-7 w-7 shrink-0" />
      )}
      <div
        className={cn(
          "min-w-0 flex-1 space-y-2",
          unit.kind === "status" && isAgentMode ? "pt-1" : row.showAvatar ? "pt-0.5" : "",
        )}
      >
        {status ? <div className="min-w-0 max-w-full overflow-hidden py-1.5">{status}</div> : null}

        {row.mutable && retryAttempts && retryAttempts.length > 0 ? (
          <RetryDetailsBlock attempts={retryAttempts} />
        ) : null}

        {unit.kind === "block" ? (
          <RoundBlockContent
            block={unit.block}
            isLive={row.live}
            renderMode={row.renderMode}
            runningToolCallIds={unit.runningToolCallIds}
            thinkingOpen={unit.thinkingOpen}
            isLatestThinking={unit.isLatestThinking}
            workdir={workdir}
            onOpenFileLink={onOpenFileLink}
          />
        ) : null}

        {unit.kind === "work-trace" ? (
          <AssistantWorkTrace
            activeStatus={
              row.live && unit.thinking && !isCompactionRunning ? (
                <ThinkingActivity reasonSummary={unit.reasonSummary} />
              ) : null
            }
            className="mb-3 mt-0"
            durationMs={unit.durationMs}
            hasDetails={workTraceDetailEntries.length > 0 || isCompactionRunning}
            running={row.live}
          >
            {workTraceDetailEntries.map((entry) => (
              <RoundBlockContent
                key={entry.key}
                block={entry.block}
                isLive={row.live}
                renderMode={row.renderMode}
                runningToolCallIds={entry.runningToolCallIds}
                thinkingOpen={row.live ? entry.thinkingOpen : true}
                isLatestThinking={false}
                showTurnStatus={row.live && entry.key === unit.latestToolGroupKey}
                workdir={workdir}
                onOpenFileLink={onOpenFileLink}
              />
            ))}
            {isCompactionRunning ? (
              <LiveAssistantStatus status={toolStatus} isCompaction className="w-full py-1.5" />
            ) : null}
          </AssistantWorkTrace>
        ) : null}
      </div>
    </div>
  );
});
