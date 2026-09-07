/**
 * 账本单行。
 *
 * 一行一条记录：角色徽标 + 摘要 + 工具结果 + 自身耗时。溢出交给 CSS 省略，
 * 完整内容在详情面板里看。
 */

import { useLocale } from "../../i18n/index";
import { cn } from "../../lib/shared/utils";
import {
  formatTrajectorySeconds,
  trajectoryFallbackLabelKey,
  trajectoryKindLabelKey,
} from "../../lib/trajectory/presentation";
import type { TrajectoryRecord, TrajectoryRecordKind } from "../../lib/trajectory/types";

const KIND_BADGE: Record<TrajectoryRecordKind, string> = {
  system: "bg-muted-foreground/20 text-muted-foreground dark:text-muted-foreground",
  user: "bg-info/20 text-info",
  context: "bg-success/20 text-success",
  compacted: "bg-warning/20 text-warning",
  message: "bg-activity/20 text-activity",
  tool: "bg-warning/20 text-warning",
  subtool: "bg-warning/10 text-warning/80",
};

export function TrajectoryRow(props: {
  record: TrajectoryRecord;
  selected: boolean;
  focused: boolean;
  dimmed: boolean;
  onSelect: (index: number) => void;
}) {
  const { t, locale } = useLocale();
  const { record } = props;
  const fallbackKey = trajectoryFallbackLabelKey(record);
  const label = fallbackKey === undefined ? record.text : t(fallbackKey);

  return (
    <button
      type="button"
      data-trajectory-index={record.index}
      aria-current={props.selected ? "true" : undefined}
      onClick={() => props.onSelect(record.index)}
      className={cn(
        "flex h-[30px] w-full min-w-0 items-center gap-2 px-3 text-left text-xs transition-colors @max-[520px]:gap-2 @max-[520px]:px-2",
        "border-l-2 border-transparent hover:bg-muted/60",
        props.selected && "border-ring bg-muted/80",
        props.focused && !props.selected && "bg-muted/40",
        props.dimmed && "opacity-35",
        record.kind === "subtool" && "pl-8 @max-[520px]:pl-4",
      )}
    >
      <span
        className={cn(
          "shrink-0 rounded-sm px-2 py-px font-medium text-2xs tracking-wide",
          record.isError ? "bg-destructive/20 text-destructive" : KIND_BADGE[record.kind],
        )}
      >
        {t(trajectoryKindLabelKey(record.kind))}
      </span>

      <span className="min-w-0 flex-1 truncate text-foreground/90">
        {record.toolName !== undefined && record.kind !== "message" && (
          <span className="font-medium">{record.toolName}</span>
        )}
        {record.toolName !== undefined && label !== record.toolName && label !== "" && (
          <span className="ml-2 text-muted-foreground">{label}</span>
        )}
        {record.toolName === undefined && label}
      </span>

      {record.result !== undefined && record.result !== "" && (
        <span className="hidden min-w-0 max-w-[38%] shrink-0 truncate text-muted-foreground md:inline">
          <span aria-hidden="true" className="mr-1">
            →
          </span>
          {record.result}
        </span>
      )}

      {record.status === "running" && (
        <span className="shrink-0 text-2xs text-muted-foreground">
          {t("trajectory.status.running")}
        </span>
      )}

      <span className="w-16 shrink-0 text-right tabular-nums text-muted-foreground @max-[520px]:w-12 @max-[520px]:text-xs">
        {record.timeSeconds === null ? "" : formatTrajectorySeconds(record.timeSeconds, locale)}
      </span>
    </button>
  );
}
