import { ChevronDown, LogOut, User } from "@liveagent/ui/components/IconSet";
import { Button } from "@liveagent/ui/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@liveagent/ui/components/ui/dropdown-menu";
import { useLocale } from "@liveagent/ui/i18n/index";
import { cn } from "@liveagent/ui/lib/shared/utils";
import type { ReactNode } from "react";

type UserMenuProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userMenuLabel: string;
  userAvatarLabel: string;
  agentStatus: "online" | "offline" | "unknown";
  agentSelector?: ReactNode;
  onLogout: () => void;
};

export function UserMenu(props: UserMenuProps) {
  const {
    open,
    onOpenChange,
    userMenuLabel,
    userAvatarLabel,
    agentStatus,
    agentSelector,
    onLogout,
  } = props;
  const { t } = useLocale();
  const statusLabel =
    agentStatus === "online"
      ? t("settings.devicesOnlineStatus")
      : agentStatus === "offline"
        ? t("settings.devicesOfflineStatus")
        : t("settings.devicesUnknownStatus");
  const statusDotClass =
    agentStatus === "online"
      ? "bg-success"
      : agentStatus === "offline"
        ? "bg-destructive"
        : "bg-muted-foreground/60";

  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            className="h-8 gap-1 rounded-full border border-border bg-background/80 px-2 text-foreground shadow-control hover:bg-muted/80"
            title={`${userMenuLabel} · ${statusLabel}`}
          />
        }
      >
        <span className="relative flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-success/90 to-info/90 text-xs font-semibold text-white">
          {userAvatarLabel || <User className="h-3.5 w-3.5" />}
          <span
            className={cn(
              "absolute -bottom-1 -right-1 h-3 w-3 rounded-full shadow-control ring-2 ring-background",
              statusDotClass,
            )}
          >
            <span className="sr-only">{statusLabel}</span>
          </span>
        </span>
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="min-w-[12rem] rounded-2xl border-border bg-popover backdrop-blur supports-[backdrop-filter]:bg-popover/90"
      >
        {agentSelector}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={onLogout}
          className="gap-2 text-destructive focus:bg-destructive/10 focus:text-destructive"
        >
          <LogOut className="h-3.5 w-3.5" />
          {t("common.logout")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
