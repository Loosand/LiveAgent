import { CheckCircle2 } from "@liveagent/ui/components/IconSet";
import type { ReactNode } from "react";
import { Button } from "../../components/ui/button";
import { Switch } from "../../components/ui/switch";
import { cn } from "../../lib/shared/utils";

export {
  ConfirmActionPopover,
  ConfirmDeletePopover,
} from "../../components/ui/confirm-action-popover";

export { SettingsGroup, SettingsRow } from "../../components/ui/settings-group";

export function SettingsChoiceRow(props: {
  icon: ReactNode;
  title: string;
  description: string;
  selected: boolean;
  onClick: () => void;
}) {
  const { icon, title, description, selected, onClick } = props;

  return (
    <Button
      variant="ghost"
      aria-pressed={selected}
      onClick={onClick}
      className="group relative flex h-auto w-full whitespace-normal rounded-none items-center gap-3 px-4 py-4 text-left transition-colors after:pointer-events-none after:absolute after:bottom-0 after:left-5 after:right-5 after:h-px after:bg-border/60 after:content-[''] last:after:hidden hover:bg-accent"
    >
      <span
        className={cn(
          "flex h-5 w-5 shrink-0 items-center justify-center transition-colors",
          selected
            ? "text-foreground/80"
            : "text-muted-foreground/40 group-hover:text-foreground/60",
        )}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-base font-medium text-foreground">{title}</span>
        <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
          {description}
        </span>
      </span>
      <span className="ml-2 flex h-5 w-5 shrink-0 items-center justify-center">
        {selected ? <CheckCircle2 className="h-4.5 w-4.5 text-foreground/80" /> : null}
      </span>
    </Button>
  );
}

export function PromptTag({ label, muted = false }: { label: string; muted?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-xs leading-none",
        muted
          ? "border-border bg-muted/40 text-muted-foreground"
          : "border-border bg-muted/60 text-foreground/80",
      )}
    >
      {label}
    </span>
  );
}

export function AgentActivationSwitch(props: {
  checked: boolean;
  title: string;
  disabled?: boolean;
  className?: string;
  onToggle: () => void;
}) {
  const { checked, title, disabled = false, className, onToggle } = props;

  return (
    <Switch
      checked={checked}
      disabled={disabled}
      title={title}
      aria-label={title}
      onCheckedChange={onToggle}
      className={className}
    />
  );
}
