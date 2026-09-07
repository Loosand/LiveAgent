import { AlertTriangle, CheckCircle2, X, XCircle } from "@liveagent/ui/components/IconSet";
import { useLocale } from "@liveagent/ui/i18n/index";
import { cn } from "@liveagent/ui/lib/shared/utils";
import { memo, useEffect, useRef } from "react";
import { IconButton } from "../ui/icon-button";

export type NotifyItem = {
  id: string;
  type: "warning" | "error" | "success";
  message: string;
};

export const NotifyToast = memo(function NotifyToast(props: {
  items: NotifyItem[];
  onDismiss: (id: string) => void;
}) {
  const { items, onDismiss } = props;
  if (items.length === 0) return null;

  return (
    <div className="absolute top-full right-4 z-50 flex flex-col gap-2 pt-2 pointer-events-none">
      {items.map((item) => (
        <ToastEntry key={item.id} item={item} onDismiss={onDismiss} />
      ))}
    </div>
  );
});

const ToastEntry = memo(function ToastEntry(props: {
  item: NotifyItem;
  onDismiss: (id: string) => void;
}) {
  const { item, onDismiss } = props;
  const { t } = useLocale();
  const elRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      const el = elRef.current;
      if (el) {
        el.classList.add("notify-toast-exit");
        const onEnd = () => onDismiss(item.id);
        el.addEventListener("animationend", onEnd, { once: true });
        // fallback in case animationend doesn't fire
        setTimeout(onEnd, 400);
      } else {
        onDismiss(item.id);
      }
    }, 5000);
    return () => clearTimeout(timer);
  }, [item.id, onDismiss]);

  const isWarning = item.type === "warning";
  const isSuccess = item.type === "success";

  return (
    <div
      ref={elRef}
      role={item.type === "error" ? "alert" : "status"}
      aria-live={item.type === "error" ? "assertive" : "polite"}
      aria-atomic="true"
      className={cn(
        "notify-toast-enter pointer-events-auto flex w-[min(18rem,calc(100vw-2rem))] items-start gap-2 rounded-lg border px-3 py-2 text-base bg-popover shadow-overlay",
        isWarning ? "border-warning/40" : isSuccess ? "border-success/40" : "border-destructive/40",
      )}
    >
      {isWarning ? (
        <AlertTriangle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
      ) : isSuccess ? (
        <CheckCircle2 aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-success" />
      ) : (
        <XCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
      )}
      <p
        className={cn(
          "min-w-0 flex-1 whitespace-pre-wrap break-words leading-relaxed",
          isWarning ? "text-warning" : isSuccess ? "text-success" : "text-destructive",
        )}
      >
        {item.message}
      </p>
      <IconButton
        size="icon-xs"
        onClick={() => onDismiss(item.id)}
        aria-label={t("common.dismissNotification")}
        className="mt-0.5 text-muted-foreground"
      >
        <X aria-hidden="true" className="h-3.5 w-3.5" />
      </IconButton>
    </div>
  );
});
