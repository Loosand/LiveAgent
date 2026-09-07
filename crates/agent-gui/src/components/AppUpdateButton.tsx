import { Download, Loader2, RefreshCw } from "@liveagent/ui/components/IconSet";
import { Button } from "@liveagent/ui/components/ui/button";
import { useLocale } from "@liveagent/ui/i18n/index";
import { cn } from "@liveagent/ui/lib/shared/utils";
import { type AppUpdateController, getAppUpdateDisplayVersion } from "../lib/appUpdates";

type AppUpdateButtonProps = {
  appUpdate: AppUpdateController;
  className?: string;
  iconOnly?: boolean;
  iconClassName?: string;
};

function interpolate(template: string, values: Record<string, string>) {
  return Object.entries(values).reduce(
    (text, [key, value]) => text.replaceAll(`{${key}}`, value),
    template,
  );
}

export function AppUpdateButton({
  appUpdate,
  className,
  iconOnly = false,
  iconClassName,
}: AppUpdateButtonProps) {
  const { t } = useLocale();
  if (!appUpdate.showUpdateButton) {
    return null;
  }

  const version = getAppUpdateDisplayVersion(appUpdate.result);
  const busy = appUpdate.installing || appUpdate.restarting;
  const installed = appUpdate.installed;
  const actionLabel = installed ? t("appUpdate.restart") : t("appUpdate.update");
  const title =
    appUpdate.status === "error" && appUpdate.message
      ? interpolate(t("appUpdate.failedRetry"), { message: appUpdate.message })
      : installed
        ? t("appUpdate.restartToComplete")
        : version
          ? interpolate(t("appUpdate.updateTo"), { version })
          : t("appUpdate.update");

  return (
    <Button
      type="button"
      variant="info"
      size="sm"
      className={cn(
        iconOnly
          ? "group/update relative h-6 w-6 shrink-0 gap-0 overflow-hidden rounded-full px-0 text-xs font-medium leading-none shadow-none transition-[width,background-color] duration-150 hover:w-10"
          : "h-[22px] shrink-0 gap-1 rounded-full px-2 text-xs font-medium leading-none shadow-none",
        className,
      )}
      disabled={busy}
      title={title}
      aria-label={title}
      onClick={() =>
        void (installed ? appUpdate.restart() : appUpdate.installAndRestart()).catch(
          () => undefined,
        )
      }
    >
      {busy ? (
        <Loader2
          className={cn(iconOnly ? "h-3 w-3" : "h-[13px] w-[13px]", iconClassName, "animate-spin")}
        />
      ) : installed ? (
        <RefreshCw
          className={cn(
            iconOnly
              ? "h-3 w-3 transition-opacity duration-150 group-hover/update:opacity-0"
              : "h-[13px] w-[13px]",
            iconClassName,
          )}
        />
      ) : (
        <Download
          className={cn(
            iconOnly
              ? "h-3 w-3 transition-opacity duration-150 group-hover/update:opacity-0"
              : "h-[13px] w-[13px]",
            iconClassName,
          )}
        />
      )}
      {iconOnly ? (
        busy ? null : (
          <span className="pointer-events-none absolute whitespace-nowrap opacity-0 transition-opacity duration-150 group-hover/update:opacity-100">
            {actionLabel}
          </span>
        )
      ) : (
        actionLabel
      )}
    </Button>
  );
}
