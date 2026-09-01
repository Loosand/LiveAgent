import { ChevronDown } from "@liveagent/ui/components/IconSet";
import { useLocale } from "@liveagent/ui/i18n/index";
import { cn } from "@liveagent/ui/lib/shared/utils";
import { type CSSProperties, type ReactNode, useEffect, useRef, useState } from "react";
import { LazyCollapse } from "./LazyCollapse";
import { useAttentionDisclosure } from "./useAttentionDisclosure";

const PIXEL_KEYS = [
  "top-start",
  "top",
  "top-end",
  "start",
  "center",
  "end",
  "bottom-start",
  "bottom",
  "bottom-end",
] as const;

const PIXEL_DELAYS = Array.from({ length: 9 }, (_, index) => {
  const row = Math.floor(index / 3);
  const column = index % 3;
  return (column + Math.abs(row - 1)) * 90;
});

type LoadingPixelStyle = CSSProperties & {
  "--chat-work-delay": `${number}ms`;
};

function WorkPixelGrid({ active }: { active: boolean }) {
  return (
    <span
      aria-hidden="true"
      className="grid shrink-0 grid-cols-[repeat(3,4px)] gap-[1.5px]"
      data-chat-work-grid=""
    >
      {PIXEL_DELAYS.map((delay, index) => (
        <span
          key={PIXEL_KEYS[index]}
          className="chat-work-pixel size-1 rounded-[1px] bg-foreground"
          data-paused={active ? undefined : ""}
          style={{ "--chat-work-delay": `${delay}ms` } as LoadingPixelStyle}
        />
      ))}
    </span>
  );
}

function formatElapsedTime(elapsedMs: number) {
  const totalSeconds = Math.floor(elapsedMs / 1_000);
  if (totalSeconds < 1) return "";
  const hours = Math.floor(totalSeconds / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;
  return [hours > 0 ? `${hours}h` : "", minutes > 0 ? `${minutes}m` : "", `${seconds}s`]
    .filter(Boolean)
    .join("");
}

export function AssistantWorkTrace({
  children,
  activeStatus,
  className,
  durationMs,
  hasDetails,
  attentionRequired = false,
  running,
  collapseAfterAnswer = false,
}: {
  children: ReactNode;
  activeStatus?: ReactNode;
  className?: string;
  durationMs?: number;
  hasDetails: boolean;
  attentionRequired?: boolean;
  running: boolean;
  /** 回复有总结文案（answer）时：回合结束（流停止）后自动折叠一次。 */
  collapseAfterAnswer?: boolean;
}) {
  const { t } = useLocale();
  const [expanded, setExpanded] = useAttentionDisclosure(attentionRequired, running);

  // 有总结文案时，回合完成（running 变 false）后自动折叠「处理中」区块一次；
  // 之后 disclosure 所有权交还给用户，手动展开/折叠不再被强制收回，
  // 也不会和 attentionRequired（待用户交互的卡片）的强制展开打架。
  useEffect(() => {
    if (!running && !attentionRequired && collapseAfterAnswer) setExpanded(false);
  }, [running, attentionRequired, collapseAfterAnswer, setExpanded]);
  const [elapsedMs, setElapsedMs] = useState(durationMs ?? 0);
  const startedAtRef = useRef<number | null>(running ? Date.now() : null);

  useEffect(() => {
    if (!running) {
      if (durationMs !== undefined) {
        setElapsedMs(Math.max(0, durationMs));
      } else if (startedAtRef.current !== null) {
        setElapsedMs(Math.max(0, Date.now() - startedAtRef.current));
      }
      return;
    }

    if (startedAtRef.current === null) startedAtRef.current = Date.now();
    const updateElapsed = () => {
      const startedAt = startedAtRef.current;
      if (startedAt !== null) setElapsedMs(Math.max(0, Date.now() - startedAt));
    };
    updateElapsed();
    const timer = window.setInterval(updateElapsed, 1_000);
    return () => window.clearInterval(timer);
  }, [durationMs, running]);

  const elapsedLabel = formatElapsedTime(elapsedMs);
  const label = `${running ? t("chat.work.running") : t("chat.work.activity")}${
    elapsedLabel ? ` ${elapsedLabel}` : ""
  }`;
  const showHeader = hasDetails || activeStatus == null;
  const header = (
    <>
      {running ? <WorkPixelGrid active /> : null}
      <span className={cn(running ? "shimmer" : "text-foreground/65")}>{label}</span>
      {hasDetails ? (
        <ChevronDown
          className={cn(
            "h-3 w-3 shrink-0 text-foreground/40 opacity-0 transition-[opacity,transform] duration-150 group-hover/work-trace:opacity-100 group-focus-visible/work-trace:opacity-100 motion-reduce:transition-none",
            !expanded && "-rotate-90",
          )}
        />
      ) : null}
      <span aria-hidden="true" className="h-px min-w-8 flex-1 bg-foreground/10" />
    </>
  );

  return (
    <section
      className={cn("my-2 text-foreground/60", className)}
      aria-label={t("chat.work.activity")}
      aria-busy={running}
      data-chat-work-trace=""
    >
      {showHeader && hasDetails ? (
        <button
          type="button"
          className="group/work-trace flex w-full items-center gap-2 rounded-lg py-1 text-[calc(13px*var(--zone-font-scale,1))] font-[450] transition-colors hover:text-foreground/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-expanded={expanded}
          onClick={() => setExpanded((current) => !current)}
        >
          {header}
        </button>
      ) : showHeader ? (
        <div className="flex items-center gap-2 py-1 text-[calc(13px*var(--zone-font-scale,1))] font-[450]">
          {header}
        </div>
      ) : null}

      {hasDetails ? (
        <LazyCollapse className="[contain:layout_paint]" open={expanded}>
          {() => <div className="mt-1 [scrollbar-gutter:stable]">{children}</div>}
        </LazyCollapse>
      ) : null}
      {activeStatus}
    </section>
  );
}
