import { HubTitleBar } from "@liveagent/adapters/hubChrome";
import type { ReactNode } from "react";
import { cn } from "../../lib/shared/utils";

export function HubBackdrop(props: { tone?: "amber" | "violet" | "neutral" }) {
  const { tone = "neutral" } = props;
  const haloClass =
    tone === "amber"
      ? "bg-[radial-gradient(circle_at_top_left,hsl(var(--background)/0.85),transparent_60%)] dark:bg-[radial-gradient(circle_at_top_left,hsl(var(--card)/0.55),transparent_60%)]"
      : tone === "violet"
        ? "bg-[radial-gradient(circle_at_top_left,hsl(var(--card)/0.85),transparent_60%)] dark:bg-[radial-gradient(circle_at_top_left,hsl(var(--card)/0.55),transparent_60%)]"
        : "bg-[radial-gradient(circle_at_top_left,hsl(var(--background)/0.8),transparent_60%)] dark:bg-[radial-gradient(circle_at_top_left,hsl(var(--card)/0.5),transparent_60%)]";
  return (
    <>
      <div className="pointer-events-none absolute inset-0 bg-[hsl(var(--hub-canvas))]" />
      <div
        className={cn(
          "pointer-events-none absolute -left-32 -top-24 h-[420px] w-[420px] rounded-full opacity-90 blur-3xl",
          haloClass,
        )}
      />
      <div
        className={cn(
          "pointer-events-none absolute -right-24 bottom-0 h-[360px] w-[360px] rounded-full opacity-60 blur-3xl",
          haloClass,
        )}
      />
    </>
  );
}

// 侧栏开关不在这里渲染：AppWorkbenchChrome(ChatHeader)常驻于所有视图之上，
// 侧栏收起时已经提供了同一个按钮。Hub 自己再画一个就会在窄屏上叠出两枚
// PanelLeft(#501 之前 Hub 页面没有顶栏，才需要自带一枚)。
export function HubHeader(props: {
  icon?: ReactNode;
  title: string;
  subtitle?: string;
  tone?: "amber" | "violet" | "neutral";
  actions?: ReactNode;
  prominent?: boolean;
}) {
  const { icon, title, subtitle, actions, prominent = false } = props;
  return (
    <>
      <HubTitleBar />
      <div
        className={cn(
          "hub-header relative z-10 px-4 sm:px-6 lg:px-8 xl:px-8",
          prominent ? "pb-4 pt-8" : "pb-3 pt-6",
        )}
      >
        <div
          className={cn(
            "mx-auto flex w-full max-w-[1320px] gap-4",
            prominent ? "items-end" : "items-center",
          )}
        >
          {icon ? (
            <div className="hub-header-icon flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-border bg-background text-foreground shadow-control">
              {icon}
            </div>
          ) : null}
          <div className="min-w-0 flex-1">
            <h1
              className={cn(
                "font-semibold leading-tight tracking-tight text-foreground",
                prominent ? "text-base" : "text-base",
              )}
            >
              {title}
            </h1>
            {subtitle ? (
              <p
                className={cn(
                  "truncate text-muted-foreground",
                  prominent ? "mt-2 text-base" : "mt-0.5 text-xs",
                )}
                title={subtitle}
              >
                {subtitle}
              </p>
            ) : null}
          </div>
          {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
        </div>
      </div>
    </>
  );
}

export function GlassPanel(props: {
  children: ReactNode;
  tone?: "default" | "muted" | "error" | "amber" | "violet" | "neutral";
  active?: boolean;
  className?: string;
}) {
  const { children, tone = "default", active = false, className } = props;
  const toneClass = (() => {
    switch (tone) {
      case "muted":
        return "border-border bg-muted/40";
      case "error":
        return "border-destructive/40 bg-destructive/5";
      case "amber":
      case "violet":
      case "neutral":
        return active
          ? "border-border bg-background/80 shadow-control dark:bg-white/5"
          : "border-border bg-background/60";
      default:
        return "border-border bg-background/60";
    }
  })();
  return (
    <div
      className={cn(
        "hub-glass-panel rounded-2xl border px-4 py-4 backdrop-blur-xl",
        toneClass,
        className,
      )}
    >
      {children}
    </div>
  );
}
