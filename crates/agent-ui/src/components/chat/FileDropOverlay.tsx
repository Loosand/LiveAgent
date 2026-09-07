import { cn } from "@liveagent/ui/lib/shared/utils";
import { Ban, Upload } from "../IconSet";

type FileDropOverlayProps = {
  canDropUpload: boolean;
  title: string;
  description: string;
  limitHint: string;
  variant?: "panel" | "composer";
};

export function FileDropOverlay(props: FileDropOverlayProps) {
  const { canDropUpload, title, description, limitHint, variant = "panel" } = props;
  if (variant === "composer") {
    return (
      <div
        className={cn(
          "file-drop-overlay pointer-events-none absolute inset-0 z-30 flex items-center justify-center rounded-2xl border border-dashed px-4 py-3 backdrop-blur-xl",
          canDropUpload
            ? "border-border bg-background/90 dark:bg-surface-inset/90"
            : "border-destructive/40 bg-background/90 dark:bg-surface-inset/90",
        )}
        aria-hidden="true"
      >
        <div className="file-drop-overlay-card flex min-w-0 items-center gap-3 text-left">
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ring-1 ring-inset",
              canDropUpload
                ? "bg-foreground/5 text-foreground/90 ring-foreground/10 dark:bg-white/5 dark:text-white/90 dark:ring-white/10"
                : "bg-destructive/10 text-destructive/90 ring-destructive/20",
            )}
          >
            {canDropUpload ? (
              <Upload className="h-5 w-5" strokeWidth={1.75} />
            ) : (
              <Ban className="h-5 w-5" strokeWidth={1.75} />
            )}
          </div>
          <div className="min-w-0">
            <div className="truncate text-base font-semibold leading-5 text-foreground">
              {title}
            </div>
            <div className="hidden max-w-[420px] truncate text-xs leading-5 text-muted-foreground sm:block">
              {description}
            </div>
          </div>
          <div
            className={cn(
              "hidden shrink-0 items-center gap-2 rounded-full border px-2 py-1 text-xs font-medium md:inline-flex",
              canDropUpload
                ? "border-border bg-foreground/5 text-muted-foreground dark:bg-white/5"
                : "border-destructive/20 bg-destructive/5 text-destructive/80",
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                "inline-flex h-1.5 w-1.5 rounded-full",
                canDropUpload ? "bg-foreground/40 dark:bg-white/60" : "bg-destructive/60",
              )}
            />
            {limitHint}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="file-drop-overlay pointer-events-none absolute inset-0 z-30 flex items-center justify-center p-4 sm:p-6 bg-white/40 backdrop-blur-md dark:bg-black/40"
      aria-hidden="true"
    >
      <div
        className={cn(
          "file-drop-overlay-zone absolute inset-3 sm:inset-4 rounded-2xl border border-dashed",
          canDropUpload
            ? "border-border bg-foreground/0 dark:bg-white/0"
            : "border-destructive/40 bg-destructive/5",
        )}
      />
      <div
        className={cn(
          "file-drop-overlay-card relative flex w-full max-w-[380px] flex-col items-center gap-4 rounded-2xl border bg-white/80 px-8 py-8 text-center shadow-overlay backdrop-blur-2xl dark:bg-card/80",
          canDropUpload
            ? "border-border ring-1 ring-inset ring-white/40 dark:ring-white/5"
            : "border-destructive/20 ring-1 ring-inset ring-destructive/10 dark:border-destructive/40",
        )}
      >
        <div
          className={cn(
            "flex h-14 w-14 items-center justify-center rounded-2xl ring-1 ring-inset",
            canDropUpload
              ? "bg-foreground/5 text-foreground/90 ring-foreground/10 dark:bg-white/5 dark:text-white/90 dark:ring-white/10"
              : "bg-destructive/10 text-destructive/90 ring-destructive/20",
          )}
        >
          {canDropUpload ? (
            <Upload className="h-6 w-6" strokeWidth={1.75} />
          ) : (
            <Ban className="h-6 w-6" strokeWidth={1.75} />
          )}
        </div>

        <div className="flex flex-col items-center gap-2">
          <div className="text-base font-semibold leading-tight tracking-tight text-foreground">
            {title}
          </div>
          <div className="max-w-[280px] text-xs leading-5 text-muted-foreground">{description}</div>
        </div>

        <div className="h-px w-12 bg-foreground/10 dark:bg-white/10" aria-hidden="true" />

        <div
          className={cn(
            "inline-flex items-center gap-2 rounded-full border px-2 py-1 text-xs font-medium",
            canDropUpload
              ? "border-border bg-foreground/5 text-muted-foreground dark:bg-white/5"
              : "border-destructive/20 bg-destructive/5 text-destructive/80",
          )}
        >
          <span
            aria-hidden="true"
            className={cn(
              "inline-flex h-1.5 w-1.5 rounded-full",
              canDropUpload ? "bg-foreground/40 dark:bg-white/60" : "bg-destructive/60",
            )}
          />
          {limitHint}
        </div>
      </div>
    </div>
  );
}
