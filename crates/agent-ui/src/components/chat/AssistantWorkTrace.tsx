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

export function AssistantWorkTrace({
  children,
  className,
  hasDetails,
  running,
}: {
  children: ReactNode;
  className?: string;
  hasDetails: boolean;
  running: boolean;
}) {
  const { t } = useLocale();
  const [expanded, setExpanded] = useState(running && hasDetails);
  const wasRunningRef = useRef(running);

  useEffect(() => {
    if (running && !wasRunningRef.current && hasDetails) setExpanded(true);
    if (!running && wasRunningRef.current) setExpanded(false);
    wasRunningRef.current = running;
  }, [hasDetails, running]);

  const label = running ? t("chat.work.running") : t("chat.work.activity");
  const header = (
    <>
      <WorkPixelGrid active={running} />
      <span className={cn(running ? "shimmer" : "text-muted-foreground")}>{label}</span>
      {hasDetails ? (
        <ChevronDown
          className={cn(
            "h-[13px] w-[13px] shrink-0 transition-transform duration-200 motion-reduce:transition-none",
            !expanded && "-rotate-90",
          )}
        />
      ) : null}
    </>
  );

  return (
    <section
      className={cn("my-3 text-muted-foreground", className)}
      aria-label={t("chat.work.activity")}
      aria-busy={running}
      data-chat-work-trace=""
    >
      {hasDetails ? (
        <button
          type="button"
          className="flex items-center gap-2 rounded-lg py-1 text-[calc(13px*var(--zone-font-scale,1))] font-medium transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-expanded={expanded}
          onClick={() => setExpanded((current) => !current)}
        >
          {header}
        </button>
      ) : (
        <div className="flex items-center gap-2 py-1 text-[calc(13px*var(--zone-font-scale,1))] font-medium">
          {header}
        </div>
      )}

      {hasDetails && expanded ? <div className="mt-1 pl-[22px]">{children}</div> : null}
    </section>
  );
}
