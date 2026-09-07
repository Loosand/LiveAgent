import { Markdown } from "@liveagent/ui/components/Markdown";
import { useState } from "react";
import { useLocale } from "../../i18n/index";
import { cn } from "../../lib/shared/utils";
import { CheckCircle2, ChevronDown } from "../IconSet";

export function ContextCheckpointCard(props: {
  content: string;
  coveredMessageCount: number;
  generatedBy: { providerId: string; model: string };
  readOnly?: boolean;
  className?: string;
}) {
  const { content, coveredMessageCount, generatedBy, readOnly = false, className } = props;
  const { t } = useLocale();
  const [expanded, setExpanded] = useState(false);
  const messageCountLabel =
    coveredMessageCount > 0
      ? t("chat.contextCheckpoint.messageCount").replace("{count}", String(coveredMessageCount))
      : t("chat.contextCheckpoint.compressed");

  return (
    <div
      className={cn(
        "checkpoint-card w-full overflow-hidden rounded-2xl border border-border bg-white/90 shadow-control dark:bg-white/5",
        className,
      )}
    >
      <button
        type="button"
        aria-expanded={expanded}
        onClick={() => setExpanded((previous) => !previous)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors duration-150 hover:bg-black/0 dark:hover:bg-white/5"
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-black/5 dark:bg-white/10">
          <CheckCircle2 size={16} strokeWidth={1.8} className="text-muted-foreground" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-foreground/90">
              {t("chat.contextCheckpoint.title")}
            </span>
            <span className="inline-flex items-center rounded-lg bg-black/5 px-2 py-px text-xs font-normal tabular-nums text-muted-foreground dark:bg-white/10">
              {messageCountLabel}
            </span>
          </div>
          <div className="mt-0.5 text-xs text-muted-foreground/80">
            {generatedBy.providerId} · {generatedBy.model}
          </div>
        </div>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 shrink-0 text-muted-foreground/60 transition-transform duration-200",
            expanded ? "rotate-0" : "-rotate-90",
          )}
        />
      </button>
      {expanded ? (
        <div className="checkpoint-expand border-t border-border px-4 py-3">
          <Markdown content={content} className="font-chat text-base" readOnly={readOnly} />
        </div>
      ) : null}
    </div>
  );
}
