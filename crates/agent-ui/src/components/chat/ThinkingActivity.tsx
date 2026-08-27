import { Brain } from "@liveagent/ui/components/IconSet";
import { useLocale } from "@liveagent/ui/i18n/index";
import { useEffect, useRef, useState } from "react";

export function ThinkingActivity() {
  const { t } = useLocale();
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const startedAtRef = useRef(performance.now());

  useEffect(() => {
    const updateElapsed = () => {
      setElapsedSeconds(
        Math.max(0, Math.floor((performance.now() - startedAtRef.current) / 1_000)),
      );
    };
    const timer = window.setInterval(updateElapsed, 1_000);
    return () => window.clearInterval(timer);
  }, []);

  const label =
    elapsedSeconds > 0
      ? `${t("chat.thinking")} ${elapsedSeconds} ${t("chat.time.seconds")}`
      : t("chat.thinking");

  return (
    <div
      aria-busy="true"
      aria-live="polite"
      className="flex items-center gap-2 py-1 text-[calc(13px*var(--zone-font-scale,1))] font-[450] text-foreground/60"
      data-thinking-status=""
    >
      <Brain className="h-3 w-3 shrink-0 text-foreground/45" />
      <span className="shimmer">{label}</span>
    </div>
  );
}
