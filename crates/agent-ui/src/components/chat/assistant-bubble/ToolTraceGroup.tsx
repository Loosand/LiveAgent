import { retainRunningToolContent } from "@liveagent/adapters/assistantBubble";
import { AssistantStatus } from "@liveagent/ui/components/chat/AssistantStatus";
import { LazyCollapse } from "@liveagent/ui/components/chat/LazyCollapse";
import { useLocale } from "@liveagent/ui/i18n/index";
import type { ToolTraceItem } from "@liveagent/ui/lib/chat/assistantBubbleAdapter";
import { cn } from "@liveagent/ui/lib/shared/utils";
import { memo, useMemo, useState } from "react";
import { ChevronRight } from "../../IconSet";
import { getToolTraceKey } from "./assistantBubbleUtils";
import { areToolTraceItemsEqual, MemoToolCallItem } from "./ToolCallItem";

function getToolGroupCounts(items: ToolTraceItem[], runningToolCallIds: string[]) {
  const runningIds = new Set(runningToolCallIds);
  let running = 0;
  let failed = 0;
  let completed = 0;
  let waiting = 0;

  for (const item of items) {
    if (item.toolCall.id && runningIds.has(item.toolCall.id)) {
      running += 1;
      continue;
    }
    if (!item.toolResult) {
      waiting += 1;
      continue;
    }
    if (item.toolResult.isError) {
      failed += 1;
      continue;
    }
    completed += 1;
  }

  return { running, failed, completed, waiting };
}

function ToolTraceGroupInner(props: {
  items: ToolTraceItem[];
  runningToolCallIds?: string[];
  readOnly?: boolean;
  redactToolContent?: boolean;
}) {
  const { items, runningToolCallIds = [], readOnly = false, redactToolContent = false } = props;
  const { t } = useLocale();
  const counts = useMemo(
    () => getToolGroupCounts(items, runningToolCallIds),
    [items, runningToolCallIds],
  );
  const [open, setOpen] = useState(true);

  if (items.length === 1) {
    const item = items[0];
    return item ? (
      <MemoToolCallItem
        item={item}
        readOnly={readOnly}
        redactToolContent={redactToolContent}
        isRunning={Boolean(item.toolCall.id && runningToolCallIds.includes(item.toolCall.id))}
      />
    ) : null;
  }

  const statusLabel =
    counts.failed > 0
      ? `${counts.failed} ${t("chat.tool.failed")}`
      : counts.running > 0
        ? `${counts.running} ${t("chat.tool.running")}`
        : counts.waiting > 0
          ? `${counts.waiting} ${t("chat.tool.waiting")}`
          : t("chat.tool.success");

  const countLabel = `${items.length} tool calls`;
  const showStatus = counts.failed > 0 || counts.running > 0 || counts.waiting > 0;

  return (
    <div className="group/tool-trace min-w-0 max-w-full pb-1">
      <button
        type="button"
        aria-expanded={open}
        aria-label={open ? t("chat.tool.collapseActivity") : t("chat.tool.expandActivity")}
        className="-mx-1.5 flex w-fit max-w-[calc(100%+0.75rem)] cursor-pointer select-none items-center gap-1.5 rounded-lg px-1.5 py-1 text-left text-[calc(12.5px*var(--zone-font-scale,1))] text-muted-foreground/75 transition-colors duration-150 hover:bg-foreground/[0.04] hover:text-foreground/80"
        onClick={() => setOpen((prev) => !prev)}
      >
        <ChevronRight
          className={cn(
            "h-3 w-3 shrink-0 text-muted-foreground/60 transition-transform duration-200 ease-out",
            open ? "rotate-90" : "",
          )}
        />
        <span className="min-w-0 truncate tabular-nums">{countLabel}</span>
        {showStatus ? (
          <span className="shrink-0 text-[calc(10.5px*var(--zone-font-scale,1))] text-muted-foreground/50">
            {counts.running > 0 ? (
              <AssistantStatus className="min-h-0 text-[calc(10.5px*var(--zone-font-scale,1))] text-muted-foreground/50">
                {statusLabel}
              </AssistantStatus>
            ) : (
              statusLabel
            )}
          </span>
        ) : null}
      </button>

      <LazyCollapse open={open} retainWhileClosed={retainRunningToolContent && counts.running > 0}>
        {() => (
          <div className="-mx-1 overflow-hidden px-1.5 pb-1 pt-1">
            <div className="flex flex-col gap-1">
              {items.map((item, index) => (
                <MemoToolCallItem
                  key={getToolTraceKey(item, index)}
                  item={item}
                  readOnly={readOnly}
                  redactToolContent={redactToolContent}
                  compactChip
                  isRunning={Boolean(
                    item.toolCall.id && runningToolCallIds.includes(item.toolCall.id),
                  )}
                />
              ))}
            </div>
          </div>
        )}
      </LazyCollapse>
    </div>
  );
}

function areRunningIdsEqual(previous?: string[], next?: string[]) {
  if (previous === next) return true;
  if (!previous || !next || previous.length !== next.length) return false;
  return previous.every((id, index) => id === next[index]);
}

// A streaming text delta rebuilds the round's grouped-block structure with
// fresh arrays but unchanged tool items — compare element-wise so the whole
// group (every child card) bails unless a tool actually changed.
export const ToolTraceGroup = memo(
  ToolTraceGroupInner,
  (previous, next) =>
    previous.readOnly === next.readOnly &&
    previous.redactToolContent === next.redactToolContent &&
    previous.items.length === next.items.length &&
    previous.items.every(
      (item, index) =>
        item === next.items[index] || areToolTraceItemsEqual(item, next.items[index]),
    ) &&
    areRunningIdsEqual(previous.runningToolCallIds, next.runningToolCallIds),
);
