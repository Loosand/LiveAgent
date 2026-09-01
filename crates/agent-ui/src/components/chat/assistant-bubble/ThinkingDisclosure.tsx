import { formatElapsedTime } from "@liveagent/ui/components/chat/AssistantWorkTrace";
import { LazyCollapse } from "@liveagent/ui/components/chat/LazyCollapse";
import { Markdown } from "@liveagent/ui/components/Markdown";
import { useLocale } from "@liveagent/ui/i18n/index";
import type { ChatFileLink } from "@liveagent/ui/lib/chat/chatFileLinks";
import { resolveThinkingDurationMs } from "@liveagent/ui/lib/chat/thinkingDurations";
import { cn } from "@liveagent/ui/lib/shared/utils";
import { useEffect, useRef, useState } from "react";
import { Brain, ChevronRight } from "../../IconSet";

/**
 * One reasoning segment in the processing trace. Streams visibly while the
 * model is thinking ("思考中"), then settles into a collapsed "思考了 Xs" /
 * "思考过程" row whose body stays unmounted until the user expands it — the
 * reasoning text is never dropped from the transcript, only folded.
 */
export function ThinkingDisclosure(props: {
  text: string;
  /** Transcript-stable identity used to time the segment across remounts. */
  trackKey: string;
  /** Whether this segment is the one currently receiving reasoning deltas. */
  active: boolean;
  renderMode?: "streaming" | "static";
  readOnly?: boolean;
  workdir?: string;
  onOpenFileLink?: (link: ChatFileLink) => void;
}) {
  const {
    text,
    trackKey,
    active,
    renderMode = "static",
    readOnly = false,
    workdir,
    onOpenFileLink,
  } = props;
  const { t } = useLocale();
  // A segment born streaming starts open so the reasoning is watchable; once
  // it settles it folds back down — unless the user toggled it, after which
  // disclosure ownership stays with them.
  const [open, setOpen] = useState(active);
  const userOwnsDisclosureRef = useRef(false);

  useEffect(() => {
    if (!active && !userOwnsDisclosureRef.current) setOpen(false);
  }, [active]);

  const durationMs = resolveThinkingDurationMs(trackKey, active);
  const durationLabel = durationMs !== null ? formatElapsedTime(durationMs) : "";
  const settledLabel = durationLabel
    ? `${t("chat.thoughtFor")} ${durationLabel}`
    : t("chat.thinkingProcess");

  return (
    <div
      className="group/thinking min-w-0 max-w-full pb-1"
      data-thinking-disclosure=""
      data-thinking-active={active ? "" : undefined}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-label={t("chat.thinkingProcess")}
        className="-mx-1.5 flex w-fit max-w-[calc(100%+0.75rem)] cursor-pointer select-none items-center gap-1.5 rounded-lg px-1.5 py-1 text-left text-[calc(13px*var(--zone-font-scale,1))] font-[450] text-foreground/60 transition-colors duration-150 hover:bg-foreground/[0.035] hover:text-foreground/75"
        onClick={() => {
          userOwnsDisclosureRef.current = true;
          setOpen((prev) => !prev);
        }}
      >
        <Brain className="h-3 w-3 shrink-0 text-foreground/45" />
        <span className={cn("min-w-0 truncate", active && "shimmer")}>
          {active ? t("chat.thinking") : settledLabel}
        </span>
        <ChevronRight
          className={cn(
            "h-3 w-3 shrink-0 text-foreground/40 opacity-0 transition-[opacity,transform] duration-150 ease-out group-hover/thinking:opacity-100 group-focus-within/thinking:opacity-100",
            open ? "rotate-90" : "",
          )}
        />
      </button>

      <LazyCollapse open={open}>
        {() => (
          <div className="-mx-1 overflow-hidden px-1.5 pb-1 pt-1">
            <div
              data-thinking-scroll=""
              className={cn(
                "max-h-[320px] overflow-y-auto overscroll-contain pr-1 [scrollbar-gutter:stable]",
                // While streaming, column-reverse keeps the scroll pinned to
                // the newest reasoning without a scroll-follow effect; settled
                // segments read top-down as usual.
                active && "flex flex-col-reverse",
              )}
            >
              <div className="border-l-2 border-foreground/10 pl-3">
                <Markdown
                  content={text}
                  className="font-chat thinking-markdown"
                  renderMode={renderMode}
                  readOnly={readOnly}
                  workdir={workdir}
                  onOpenFileLink={onOpenFileLink}
                />
              </div>
            </div>
          </div>
        )}
      </LazyCollapse>
    </div>
  );
}
