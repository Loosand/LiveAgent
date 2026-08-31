const REASON_SUMMARY_TAIL_CHARS = 800;
const DEFAULT_REASON_SUMMARY_MAX_CHARS = 120;

type ThinkingActivityBlock = {
  kind: string;
  text?: string;
  item?: {
    status?: string;
    toolResult?: unknown;
  };
};

type ThinkingActivityRound = {
  blocks: readonly ThinkingActivityBlock[];
  runningToolCallIds?: readonly string[];
  thinkingOpen?: boolean;
};

export type LiveThinkingActivity = {
  active: boolean;
  reasonSummary: string | null;
};

function stripInlineMarkdown(value: string) {
  return value
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/(?:\*\*|__|~~)(.*?)(?:\*\*|__|~~)/g, "$1")
    .replace(/[*_~]/g, "");
}

export function compactReasonSummary(
  value: string,
  maxChars = DEFAULT_REASON_SUMMARY_MAX_CHARS,
): string | null {
  const paragraphs = value
    .slice(-REASON_SUMMARY_TAIL_CHARS)
    .replace(/\r\n?/g, "\n")
    .split(/\n\s*\n/)
    .map((paragraph) =>
      stripInlineMarkdown(paragraph)
        .replace(/^\s*(?:#{1,6}|>|[-+*]|\d+[.)])\s+/gm, "")
        .replace(/\s+/g, " ")
        .trim(),
    )
    .filter(Boolean);
  const summary = paragraphs.at(-1);
  if (!summary) return null;

  const characters = Array.from(summary);
  if (characters.length <= maxChars) return summary;
  return `${characters.slice(0, Math.max(0, maxChars - 1)).join("")}…`;
}

export function resolveLiveThinkingActivity(
  rounds: readonly ThinkingActivityRound[],
): LiveThinkingActivity {
  const round = rounds.at(-1);
  if (!round) return { active: true, reasonSummary: null };
  if ((round.runningToolCallIds?.length ?? 0) > 0) {
    return { active: false, reasonSummary: null };
  }

  const lastBlock = round.blocks.at(-1);
  if (lastBlock?.kind === "text") return { active: false, reasonSummary: null };

  const thinkingBlock = lastBlock?.kind === "thinking" ? lastBlock : null;
  const active =
    !lastBlock ||
    round.thinkingOpen === true ||
    thinkingBlock !== null ||
    (lastBlock.kind === "tool" && lastBlock.item?.toolResult !== undefined) ||
    (lastBlock.kind === "hostedSearch" && lastBlock.item?.status !== "searching");
  return {
    active,
    reasonSummary: active && thinkingBlock?.text ? compactReasonSummary(thinkingBlock.text) : null,
  };
}
