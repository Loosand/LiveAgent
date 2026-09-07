import type { SyntheticEvent } from "react";
import { Switch } from "../ui/switch";

/** Resource event isolation; appearance and keyboard behavior belong to Switch. */
export function ResourceActivationSwitch(props: {
  checked: boolean;
  label: string;
  disabled?: boolean;
  compact?: boolean;
  stopPropagation?: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  const stopEventPropagation = (event: SyntheticEvent) => {
    if (props.stopPropagation) event.stopPropagation();
  };
  return (
    <Switch
      checked={props.checked}
      aria-label={props.label}
      title={props.label}
      disabled={props.disabled}
      size={props.compact ? "default" : "lg"}
      onCheckedChange={props.onCheckedChange}
      onPointerDown={stopEventPropagation}
      onMouseDown={stopEventPropagation}
      onClick={stopEventPropagation}
      onKeyDown={stopEventPropagation}
    />
  );
}
