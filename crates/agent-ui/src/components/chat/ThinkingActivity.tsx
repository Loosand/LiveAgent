import { Brain, ChevronDown } from "@liveagent/ui/components/IconSet";
import { useLocale } from "@liveagent/ui/i18n/index";
import { cn } from "@liveagent/ui/lib/shared/utils";
import { useEffect, useRef, useState } from "react";
import type { ChatFileLink } from "../../lib/chat/chatFileLinks";
import { Markdown } from "../Markdown";

function getThinkingLabel(t: (key: string) => string, isRunning: boolean, elapsedSeconds: number) {
  if (isRunning) {
    return elapsedSeconds > 0
      ? `${t("chat.thinking")} ${elapsedSeconds} ${t("chat.time.seconds")}`
      : t("chat.thinking");
  }
  return elapsedSeconds > 0
    ? `${t("chat.thoughtFor")} ${elapsedSeconds} ${t("chat.time.seconds")}`
    : t("chat.thinkingProcess");
}

export function ThinkingActivity(props: {
  text: string;
  open?: boolean;
  isRunning?: boolean;
  renderMode: "streaming" | "static";
  workdir?: string;
  onOpenFileLink?: (link: ChatFileLink) => void;
}) {
  const { text, open, isRunning = false, renderMode, workdir, onOpenFileLink } = props;
  const { t } = useLocale();
  const [isOpen, setIsOpen] = useState(typeof open === "boolean" ? open : true);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const userInteractedRef = useRef(false);
  const contentRef = useRef<HTMLElement>(null);
  const followTailRef = useRef(true);
  const startedAtRef = useRef<number | null>(null);
  const hasText = /\S/.test(text);

  useEffect(() => {
    if (!userInteractedRef.current && typeof open === "boolean") {
      setIsOpen(open);
    }
  }, [open]);

  useEffect(() => {
    if (!isRunning) return;
    if (startedAtRef.current === null) startedAtRef.current = performance.now();
    const updateElapsed = () => {
      const startedAt = startedAtRef.current;
      if (startedAt === null) return;
      setElapsedSeconds(Math.max(0, Math.floor((performance.now() - startedAt) / 1_000)));
    };
    updateElapsed();
    const timer = window.setInterval(updateElapsed, 1_000);
    return () => window.clearInterval(timer);
  }, [isRunning]);

  useEffect(() => {
    const content = contentRef.current;
    const markdown = content?.firstElementChild;
    if (!content || !markdown || !isOpen || !isRunning) return;

    const followTail = () => {
      if (followTailRef.current) content.scrollTop = content.scrollHeight;
    };
    followTail();
    const observer = new ResizeObserver(followTail);
    observer.observe(markdown);
    return () => observer.disconnect();
  }, [isOpen, isRunning]);

  if (!hasText) return null;

  return (
    <section className="my-3 text-muted-foreground" aria-busy={isRunning}>
      <button
        type="button"
        aria-expanded={isOpen}
        onClick={() => {
          userInteractedRef.current = true;
          setIsOpen((previous) => !previous);
        }}
        className="thinking-block-toggle flex cursor-pointer select-none items-center gap-2 rounded-md py-1 text-left text-[calc(13px*var(--zone-font-scale,1))] text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Brain className="h-[15px] w-[15px] shrink-0" />
        <span className="thinking-block-label">
          {getThinkingLabel(t, isRunning, elapsedSeconds)}
        </span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 transition-transform duration-200 ease-out motion-reduce:transition-none",
            !isOpen && "-rotate-90",
          )}
        />
      </button>
      {isOpen ? (
        <div className="mt-2 pl-[23px]">
          <section
            ref={contentRef}
            aria-label={t("chat.thinkingProcess")}
            className="max-h-48 overflow-y-auto pr-2 [scrollbar-gutter:stable] focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onScroll={(event) => {
              const content = event.currentTarget;
              followTailRef.current =
                content.scrollHeight - content.scrollTop - content.clientHeight <= 24;
            }}
          >
            <Markdown
              content={text}
              className="thinking-markdown text-[calc(13px*var(--zone-font-scale,1))] leading-6 text-muted-foreground/90"
              renderMode={renderMode}
              showCaret={false}
              workdir={workdir}
              onOpenFileLink={onOpenFileLink}
            />
          </section>
        </div>
      ) : null}
    </section>
  );
}
