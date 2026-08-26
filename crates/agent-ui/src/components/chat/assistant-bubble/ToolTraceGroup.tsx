import type { ToolTraceItem } from "@liveagent/ui/lib/chat/assistantBubbleAdapter";
import { memo } from "react";
import { getToolTraceKey } from "./assistantBubbleUtils";
import { areToolTraceItemsEqual, MemoToolCallItem } from "./ToolCallItem";

function ToolTraceGroupInner(props: {
  items: ToolTraceItem[];
  runningToolCallIds?: string[];
  readOnly?: boolean;
  redactToolContent?: boolean;
}) {
  const { items, runningToolCallIds = [], readOnly = false, redactToolContent = false } = props;

  return (
    <div className="flex min-w-0 max-w-full flex-col gap-0.5">
      {items.map((item, index) => (
        <MemoToolCallItem
          key={getToolTraceKey(item, index)}
          item={item}
          readOnly={readOnly}
          redactToolContent={redactToolContent}
          isRunning={Boolean(item.toolCall.id && runningToolCallIds.includes(item.toolCall.id))}
        />
      ))}
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
