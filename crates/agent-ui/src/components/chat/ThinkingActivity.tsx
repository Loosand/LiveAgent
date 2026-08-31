import { Brain } from "@liveagent/ui/components/IconSet";
import { useLocale } from "@liveagent/ui/i18n/index";

export function ThinkingActivity({ reasonSummary }: { reasonSummary?: string | null }) {
  const { t } = useLocale();

  return (
    <div
      aria-busy="true"
      aria-live="polite"
      className="flex min-w-0 items-center gap-2 py-1 text-[calc(13px*var(--zone-font-scale,1))] font-[450] text-foreground/60"
      data-thinking-status=""
      role="status"
    >
      <Brain className="h-3 w-3 shrink-0 text-foreground/45" />
      <span className="shimmer shrink-0">{t("chat.thinkingActive")}</span>
      {reasonSummary ? (
        <>
          <span aria-hidden="true" className="shrink-0 text-foreground/30">
            ·
          </span>
          <span
            className="min-w-0 truncate text-foreground/45"
            data-reason-summary=""
            title={reasonSummary}
          >
            {reasonSummary}
          </span>
        </>
      ) : null}
    </div>
  );
}
