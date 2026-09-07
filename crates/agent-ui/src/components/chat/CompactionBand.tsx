import { FoldVertical } from "@liveagent/ui/components/IconSet";
import { cn } from "@liveagent/ui/lib/shared/utils";
import type { ButtonHTMLAttributes, ReactNode } from "react";

/**
 * The compaction family's shared chrome: a tinted band with a violet accent,
 * deliberately off the grey scale used by reasoning/tool rows so a context
 * fold stands out while scanning history. Both the live "compressing"
 * status and the settled in-reply seam wear it, so they read as the same
 * event at two moments. Dependency-light on purpose (no Markdown) so the
 * status layer can import it without pulling the renderer stack.
 */
export function CompactionBand(props: {
  active?: boolean;
  icon?: ReactNode;
  label: ReactNode;
  meta?: ReactNode;
  trailing?: ReactNode;
  className?: string;
  as?: "div" | "button";
  buttonProps?: ButtonHTMLAttributes<HTMLButtonElement>;
}) {
  const { active = false, icon, label, meta, trailing, className, as = "div", buttonProps } = props;
  const content = (
    <>
      <span
        aria-hidden="true"
        className={cn(
          "compaction-band-icon flex h-5 w-5 shrink-0 items-center justify-center rounded-lg bg-activity/10 text-activity dark:bg-activity/10",
          active && "compaction-band-icon-active",
        )}
      >
        {icon ?? <FoldVertical className="h-3 w-3" />}
      </span>
      <span
        className={cn("min-w-0 truncate text-xs font-medium text-activity", active && "shimmer")}
      >
        {label}
      </span>
      {meta ? (
        <span className="flex min-w-0 shrink items-center gap-1 overflow-hidden">{meta}</span>
      ) : null}
      {trailing}
      {active ? <span aria-hidden="true" className="compaction-band-progress" /> : null}
    </>
  );
  const baseClass = cn(
    "compaction-band relative flex w-full min-w-0 items-center gap-2 overflow-hidden rounded-lg border border-activity/20 bg-activity/5 py-2 pl-2 pr-2 text-left transition-colors duration-150 dark:border-activity/20 dark:bg-activity/5",
    active && "compaction-band-active",
    className,
  );
  if (as === "button") {
    return (
      <button
        type="button"
        data-compaction-band=""
        data-active={active ? "" : undefined}
        {...buttonProps}
        className={cn(baseClass, buttonProps?.className)}
      >
        {content}
      </button>
    );
  }
  return (
    <div className={baseClass} data-compaction-band="" data-active={active ? "" : undefined}>
      {content}
    </div>
  );
}

export function CompactionMetaChip({ children }: { children: ReactNode }) {
  return (
    <span className="shrink-0 rounded-lg bg-activity/10 px-2 py-px text-2xs font-medium tabular-nums text-activity/80 dark:bg-activity/10">
      {children}
    </span>
  );
}
