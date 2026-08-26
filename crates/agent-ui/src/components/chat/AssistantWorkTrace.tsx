import { ChevronDown } from "@liveagent/ui/components/IconSet";
import { useLocale } from "@liveagent/ui/i18n/index";
import { cn } from "@liveagent/ui/lib/shared/utils";
import { type CSSProperties, type ReactNode, useEffect, useRef, useState } from "react";

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
  className,
  durationMs,
  hasDetails,
  running,
}: {
  children: ReactNode;
  className?: string;
  durationMs?: number;
  hasDetails: boolean;
  running: boolean;
}) {
  const { t } = useLocale();
  const [expanded, setExpanded] = useState(running && hasDetails);
  const [elapsedMs, setElapsedMs] = useState(durationMs ?? 0);
  const wasRunningRef = useRef(running);
  const userInteractedRef = useRef(false);
  const startedAtRef = useRef<number | null>(running ? Date.now() : null);

  useEffect(() => {
    if (!userInteractedRef.current) {
      if (running && !wasRunningRef.current && hasDetails) setExpanded(true);
      if (!running && wasRunningRef.current) setExpanded(false);
    }
    wasRunningRef.current = running;
  }, [hasDetails, running]);

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
  const header = (
    <>
      {running ? <WorkPixelGrid active /> : null}
      <span className={cn(running ? "shimmer" : "text-muted-foreground")}>{label}</span>
      {hasDetails ? (
        <ChevronDown
          className={cn(
            "h-[13px] w-[13px] shrink-0 transition-transform duration-200 motion-reduce:transition-none",
            !expanded && "-rotate-90",
          )}
        />
      ) : null}
      <span aria-hidden="true" className="h-px min-w-8 flex-1 bg-border/65" />
    </>
  );

  return (
    <section
      className={cn("my-2 text-muted-foreground", className)}
      aria-label={t("chat.work.activity")}
      aria-busy={running}
      data-chat-work-trace=""
    >
      {hasDetails ? (
        <button
          type="button"
          className="flex w-full items-center gap-2 rounded-lg py-1 text-[calc(13px*var(--zone-font-scale,1))] font-medium transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-expanded={expanded}
          onClick={() => {
            userInteractedRef.current = true;
            setExpanded((current) => !current);
          }}
        >
          {header}
        </button>
      ) : (
        <div className="flex items-center gap-2 py-1 text-[calc(13px*var(--zone-font-scale,1))] font-medium">
          {header}
        </div>
      )}

      {hasDetails && expanded ? <div className="mt-1">{children}</div> : null}
    </section>
  );
}
