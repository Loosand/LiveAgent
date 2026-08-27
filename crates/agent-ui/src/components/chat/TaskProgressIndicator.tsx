import { Check, ChevronDown } from "@liveagent/ui/components/IconSet";
import { useId, useState } from "react";
import type { TaskItem } from "../../contracts/task";
import type { TaskProgressSnapshot } from "../../lib/chat/taskProgress";
import { cn } from "../../lib/shared/utils";

export type TaskProgressIndicatorLabels = {
  title: string;
  step: string;
  completedCount: string;
  running: string;
  pending: string;
  paused: string;
  completed: string;
  taskPaused: string;
  taskCompleted: string;
};

type DisplayState = "running" | "pending" | "paused" | "completed";

function TaskStepRing({
  active,
  paused,
  step,
}: {
  active: boolean;
  paused: boolean;
  step: number;
}) {
  const size = 22;
  const strokeWidth = 2;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const accentClassName = paused
    ? "stroke-amber-600 dark:stroke-amber-300"
    : "stroke-[hsl(var(--tool-list-accent))]";

  return (
    <span
      aria-hidden="true"
      className="relative inline-flex size-[22px] shrink-0 items-center justify-center"
    >
      <svg
        aria-hidden="true"
        className="absolute inset-0"
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        width={size}
      >
        <circle
          className="stroke-border"
          cx={size / 2}
          cy={size / 2}
          fill="none"
          r={radius}
          strokeWidth={strokeWidth}
        />
        {active ? (
          <circle
            className={cn("origin-center animate-spin motion-reduce:animate-none", accentClassName)}
            cx={size / 2}
            cy={size / 2}
            fill="none"
            r={radius}
            strokeDasharray={`${circumference * 0.3} ${circumference * 0.7}`}
            strokeLinecap="round"
            strokeWidth={strokeWidth}
          />
        ) : null}
      </svg>
      <span className="relative text-[10px] font-semibold tabular-nums text-foreground">
        {step}
      </span>
    </span>
  );
}

function CompletedBadge() {
  return (
    <span
      aria-hidden="true"
      className="inline-flex size-[22px] shrink-0 items-center justify-center rounded-full bg-[hsl(var(--chat-success))] text-white"
    >
      <Check className="size-3.5" strokeWidth={3} />
    </span>
  );
}

function getTaskDisplayState(task: TaskItem, isConversationRunning: boolean): DisplayState {
  if (task.status === "completed") return "completed";
  if (task.status === "pending") return "pending";
  if (!isConversationRunning) return "paused";
  return "running";
}

export function TaskProgressIndicator({
  snapshot,
  isConversationRunning,
  labels,
}: {
  snapshot: TaskProgressSnapshot;
  isConversationRunning: boolean;
  labels: TaskProgressIndicatorLabels;
}) {
  const instanceId = useId();
  const [expansion, setExpansion] = useState<{
    runId: string;
    tasks: Record<string, boolean>;
  }>(() => ({ runId: snapshot.runId, tasks: {} }));
  const [panelExpansionOverride, setPanelExpansionOverride] = useState<{
    runId: string;
    open: boolean;
  } | null>(null);
  const expansionOverrides = expansion.runId === snapshot.runId ? expansion.tasks : {};
  const displayState: DisplayState =
    snapshot.state === "completed"
      ? "completed"
      : !isConversationRunning
        ? "paused"
        : snapshot.state === "in_progress"
          ? "running"
          : "pending";
  const summaryText = [labels.title, labels.step, labels.completedCount, labels[displayState]].join(
    " · ",
  );
  const panelOpen =
    panelExpansionOverride?.runId === snapshot.runId
      ? panelExpansionOverride.open
      : snapshot.state !== "completed";
  const panelId = `${instanceId}-tasks`;

  return (
    <fieldset
      aria-label={labels.title}
      className="relative z-40 mx-auto mb-4 w-full max-w-[440px] border-0 p-0"
    >
      <legend className="sr-only">{labels.title}</legend>
      <span
        aria-label={summaryText}
        aria-valuemax={snapshot.totalCount}
        aria-valuemin={0}
        aria-valuenow={snapshot.completedCount}
        className="sr-only"
        role="progressbar"
      />

      <button
        aria-controls={panelId}
        aria-expanded={panelOpen}
        aria-label={summaryText}
        className="mb-2 flex h-10 w-full items-center gap-2 rounded-[20px] bg-background/92 px-3 text-left text-[12px] text-muted-foreground shadow-[0_0_0_1px_rgba(0,0,0,0.07),0_1px_2px_-1px_rgba(0,0,0,0.08),0_8px_24px_-16px_rgba(15,23,42,0.38)] outline-none backdrop-blur-xl backdrop-saturate-150 transition-[background-color,box-shadow] hover:bg-background focus-visible:ring-2 focus-visible:ring-ring/55 dark:shadow-[0_0_0_1px_rgba(255,255,255,0.12),0_8px_24px_-16px_rgba(0,0,0,0.72)]"
        data-task-progress-toggle=""
        onClick={() => {
          setPanelExpansionOverride({ runId: snapshot.runId, open: !panelOpen });
        }}
        type="button"
      >
        <span
          aria-hidden="true"
          className={cn(
            "size-2 shrink-0 rounded-full",
            displayState === "completed" && "bg-[hsl(var(--chat-success))]",
            displayState === "running" &&
              "animate-pulse bg-[hsl(var(--tool-list-accent))] motion-reduce:animate-none",
            displayState === "paused" && "bg-amber-500",
            displayState === "pending" && "bg-muted-foreground/50",
          )}
        />
        <span className="min-w-0 flex-1 truncate font-medium text-foreground/85">
          {labels.title}
        </span>
        <span className="shrink-0 tabular-nums">{labels.completedCount}</span>
        <span
          className={cn(
            "shrink-0 rounded-full px-2 py-0.5 font-medium",
            displayState === "completed" &&
              "bg-[hsl(var(--chat-success)/0.10)] text-[hsl(var(--chat-success))]",
            displayState === "running" && "text-[hsl(var(--tool-list-accent))]",
            displayState === "paused" && "bg-amber-500/10 text-amber-700 dark:text-amber-300",
          )}
        >
          {labels[displayState]}
        </span>
        <ChevronDown
          aria-hidden="true"
          className={cn(
            "size-3.5 shrink-0 transition-transform duration-300 ease-out motion-reduce:transition-none",
            panelOpen && "rotate-180",
          )}
        />
      </button>

      <div
        data-task-progress-panel=""
        hidden={!panelOpen}
        id={panelId}
        className="max-h-[min(264px,40vh)] overflow-y-auto overscroll-contain p-px"
      >
        <div className="flex flex-col gap-2">
          {snapshot.tasks.map((task, index) => {
            const taskDisplayState = getTaskDisplayState(task, isConversationRunning);
            const isOpen = expansionOverrides[task.id] ?? task.status === "in_progress";
            const detailId = `${instanceId}-task-${task.id}`;
            const statusText =
              taskDisplayState === "completed"
                ? labels.taskCompleted
                : taskDisplayState === "paused"
                  ? labels.taskPaused
                  : labels[taskDisplayState];
            const isActive = task.status === "in_progress";

            return (
              <div
                aria-current={isActive ? "step" : undefined}
                className={cn(
                  "animate-in shrink-0 overflow-hidden bg-background/92 text-foreground shadow-[0_0_0_1px_rgba(0,0,0,0.07),0_1px_2px_-1px_rgba(0,0,0,0.08),0_8px_24px_-16px_rgba(15,23,42,0.38)] fade-in-0 slide-in-from-bottom-1 backdrop-blur-xl backdrop-saturate-150 transition-[border-radius,background-color,box-shadow] duration-300 ease-out motion-reduce:animate-none motion-reduce:transition-none dark:shadow-[0_0_0_1px_rgba(255,255,255,0.12),0_8px_24px_-16px_rgba(0,0,0,0.72)]",
                  isOpen ? "rounded-[14px]" : "rounded-[22px]",
                  isActive && "bg-background/96",
                )}
                data-task-status={task.status}
                key={task.id}
                style={{ animationDelay: `${index * 80}ms` }}
              >
                <button
                  aria-controls={detailId}
                  aria-expanded={isOpen}
                  aria-label={`${task.subject} · ${statusText}`}
                  className="flex h-11 w-full items-center gap-2.5 px-2.5 text-left outline-none transition-colors duration-200 hover:bg-muted/35 focus-visible:bg-muted/35 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/55 motion-reduce:transition-none"
                  onClick={() => {
                    setExpansion((current) => ({
                      runId: snapshot.runId,
                      tasks: {
                        ...(current.runId === snapshot.runId ? current.tasks : {}),
                        [task.id]: !isOpen,
                      },
                    }));
                  }}
                  type="button"
                >
                  <span className="flex size-6 shrink-0 items-center justify-center">
                    {task.status === "completed" ? (
                      <CompletedBadge />
                    ) : (
                      <TaskStepRing
                        active={taskDisplayState === "running"}
                        paused={taskDisplayState === "paused"}
                        step={index + 1}
                      />
                    )}
                  </span>
                  <span
                    className={cn(
                      "min-w-0 flex-1 truncate text-[13px] font-medium",
                      task.status === "completed" && "text-muted-foreground",
                    )}
                  >
                    {task.subject}
                  </span>
                  <span
                    className={cn(
                      "shrink-0 whitespace-nowrap text-[11.5px] font-medium tabular-nums",
                      taskDisplayState === "completed" &&
                        "rounded-full bg-[hsl(var(--chat-success)/0.10)] px-2 py-0.5 text-[hsl(var(--chat-success))]",
                      taskDisplayState === "running" && "text-[hsl(var(--tool-list-accent))]",
                      taskDisplayState === "paused" &&
                        "rounded-full bg-amber-500/10 px-2 py-0.5 text-amber-700 dark:text-amber-300",
                      taskDisplayState === "pending" && "text-muted-foreground",
                    )}
                  >
                    {statusText}
                  </span>
                  <span
                    aria-hidden="true"
                    className="-ml-1.5 flex size-7 shrink-0 items-center justify-center rounded-full text-muted-foreground"
                  >
                    <ChevronDown
                      className={cn(
                        "size-3.5 transition-transform duration-300 ease-out motion-reduce:transition-none",
                        isOpen && "rotate-180",
                      )}
                    />
                  </span>
                </button>

                <div
                  aria-hidden={!isOpen}
                  className="grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none"
                  id={detailId}
                  style={{
                    gridTemplateRows: isOpen ? "1fr" : "0fr",
                    opacity: isOpen ? 1 : 0,
                  }}
                >
                  <div className="overflow-hidden">
                    <div className="mb-2.5 grid grid-cols-[24px_minmax(0,1fr)] gap-2.5 px-2.5">
                      <span aria-hidden="true" className="mx-auto h-full w-px bg-border" />
                      <div className="flex min-w-0 items-start justify-between gap-3 py-0.5">
                        <span className="min-w-0 text-pretty text-xs leading-5 text-muted-foreground">
                          {task.description}
                        </span>
                        <span className="shrink-0 pt-0.5 font-mono text-[11px] text-muted-foreground/70 tabular-nums">
                          {index + 1}/{snapshot.totalCount}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </fieldset>
  );
}
