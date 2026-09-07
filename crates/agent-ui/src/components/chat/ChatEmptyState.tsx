import { getAssistantAvatarUrl } from "@liveagent/adapters/assistantAvatar";
import { FolderTree, Lightbulb, Settings, Wrench } from "@liveagent/ui/components/IconSet";
import { useLocale } from "@liveagent/ui/i18n/index";
import { cn } from "@liveagent/ui/lib/shared/utils";
import { type CSSProperties, useEffect, useState } from "react";

type GreetingPeriod = "morning" | "noon" | "afternoon" | "evening" | "night";

const GREETING_KEYS: Record<GreetingPeriod, string> = {
  morning: "chat.greetingMorning",
  noon: "chat.greetingNoon",
  afternoon: "chat.greetingAfternoon",
  evening: "chat.greetingEvening",
  night: "chat.greetingNight",
};

function resolveGreetingPeriod(hour: number): GreetingPeriod {
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 14) return "noon";
  if (hour >= 14 && hour < 18) return "afternoon";
  if (hour >= 18 && hour < 23) return "evening";
  return "night";
}

function useGreetingPeriod() {
  const [period, setPeriod] = useState<GreetingPeriod>(() =>
    resolveGreetingPeriod(new Date().getHours()),
  );

  useEffect(() => {
    const timer = window.setInterval(() => {
      setPeriod(resolveGreetingPeriod(new Date().getHours()));
    }, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  return period;
}

const SUGGESTION_CARDS = [
  {
    key: "explore",
    icon: FolderTree,
    chipClassName: "text-info",
    titleKey: "chat.suggestExploreTitle",
    promptKey: "chat.suggestExplorePrompt",
  },
  {
    key: "fix",
    icon: Wrench,
    chipClassName: "text-warning",
    titleKey: "chat.suggestFixTitle",
    promptKey: "chat.suggestFixPrompt",
  },
  {
    key: "ideate",
    icon: Lightbulb,
    chipClassName: "text-success",
    titleKey: "chat.suggestIdeateTitle",
    promptKey: "chat.suggestIdeatePrompt",
  },
] as const;

export type ChatEmptyStateProps = {
  variant: "no-models" | "start-chat";
  onOpenSettings?: (section?: "providers") => void;
  onSuggestionSelect?: (text: string) => void;
  /** Locks the suggestion cards while a picked prompt is still typing in. */
  suggestionsDisabled?: boolean;
};

export function ChatEmptyState({
  variant,
  onOpenSettings,
  onSuggestionSelect,
  suggestionsDisabled = false,
}: ChatEmptyStateProps) {
  const { t } = useLocale();
  const period = useGreetingPeriod();

  return (
    <div className="relative flex w-full flex-col items-center">
      <div className="chat-hero-logo-enter relative mb-4 flex h-14 w-14 items-center justify-center">
        {/* Idle float lives on an inner wrapper so its transform never fights
            the entrance animation on the outer node. */}
        <div className="chat-hero-logo-float relative flex h-full w-full items-center justify-center">
          <div
            aria-hidden="true"
            className="chat-hero-halo-breathe absolute inset-1 rounded-full bg-info/10 blur-xl"
          />
          <img
            src={getAssistantAvatarUrl()}
            alt=""
            aria-hidden="true"
            draggable={false}
            className="relative h-12 w-12 select-none object-contain"
          />
        </div>
      </div>

      {variant === "no-models" ? (
        <>
          <div className="chat-hero-title-enter mb-2 text-center text-base font-semibold leading-7 tracking-tight text-foreground">
            {t("chat.welcome")}
          </div>
          <div className="chat-hero-line-enter mb-0.5 text-center text-base leading-5 text-muted-foreground">
            {t("chat.noModelSelected")}
          </div>
          <div className="chat-hero-line-enter text-center text-base leading-5 text-muted-foreground">
            {t("chat.configureModel")}
          </div>
          {onOpenSettings ? (
            <button
              type="button"
              onClick={() => onOpenSettings("providers")}
              className="chat-hero-cta-enter mt-4 inline-flex h-8 items-center gap-2 rounded-lg bg-foreground/5 px-3 text-xs font-normal text-foreground/90 transition-colors hover:bg-foreground/10 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
            >
              <Settings className="h-4 w-4 text-foreground/60" />
              {t("chat.goToSettings")}
            </button>
          ) : null}
        </>
      ) : (
        <>
          <div className="chat-hero-title-enter whitespace-nowrap text-center text-base font-semibold leading-7 tracking-tight text-foreground">
            {t(GREETING_KEYS[period])}，{t("chat.greetingSubtitle")}
          </div>
          {onSuggestionSelect ? (
            <div className="mt-8 grid w-full max-w-[520px] grid-cols-1 gap-2 px-6 sm:grid-cols-3 sm:px-4">
              {SUGGESTION_CARDS.map((card, index) => (
                <button
                  key={card.key}
                  type="button"
                  disabled={suggestionsDisabled}
                  onClick={() => onSuggestionSelect(t(card.promptKey))}
                  style={{ "--chat-hero-delay": `${0.26 + index * 0.08}s` } as CSSProperties}
                  className="chat-hero-card-enter flex h-11 items-center gap-2 rounded-lg bg-foreground/5 px-2 text-left text-foreground/90 transition-colors hover:bg-foreground/10 hover:text-foreground focus-visible:bg-foreground/10 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"
                >
                  <span
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center",
                      card.chipClassName,
                    )}
                  >
                    <card.icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 truncate text-base font-medium leading-5 text-foreground/90">
                    {t(card.titleKey)}
                  </span>
                </button>
              ))}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
