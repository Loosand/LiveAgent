export type MentionChipVariant =
  | "file"
  | "dir"
  | "skill"
  | "app"
  | "commit"
  | "gitFile"
  | "conversation"
  | "codeRef"
  | "pastedText";

type MentionChipClassOptions = {
  interactive?: boolean;
  selectable?: boolean;
};

const BASE_CHIP_CLASS =
  "mention-chip mx-0.5 inline-flex items-baseline gap-1 rounded-sm px-2 align-baseline whitespace-nowrap";

const VARIANT_CLASS: Record<MentionChipVariant, string> = {
  file: "bg-info/20 text-info",
  dir: "bg-warning/20 text-warning",
  skill: "bg-activity/20 text-activity",
  app: "bg-success/20 text-success",
  commit: "bg-info/20 text-info",
  gitFile: "bg-info/20 text-info",
  conversation: "bg-success/20 text-success",
  codeRef: "bg-activity/20 text-activity",
  pastedText: "bg-success/20 text-success",
};

const INTERACTIVE_HOVER_CLASS: Partial<Record<MentionChipVariant, string>> = {
  commit: "hover:bg-info/20",
  gitFile: "hover:bg-info/20",
  codeRef: "hover:bg-activity/20",
};

export function mentionChipClassName(
  variant: MentionChipVariant,
  options: MentionChipClassOptions = {},
) {
  return [
    BASE_CHIP_CLASS,
    VARIANT_CLASS[variant],
    options.interactive ? "cursor-pointer" : "cursor-default",
    options.interactive ? INTERACTIVE_HOVER_CLASS[variant] : "",
    options.selectable === false ? "select-none" : "",
  ]
    .filter(Boolean)
    .join(" ");
}
