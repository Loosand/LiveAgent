import { isTaskToolName } from "@liveagent/ui/contracts/task";
import type {
  HostedSearchBlock,
  ToolResultMessage,
  ToolTraceItem,
  UiRound,
} from "@liveagent/ui/lib/chat/assistantBubbleAdapter";
import {
  isDynamicMcpToolName,
  safeStringify,
  shouldDisplayToolTraceItem,
} from "@liveagent/ui/lib/chat/assistantBubbleAdapter";
import { isTaskToolBlock } from "@liveagent/ui/lib/chat/taskProgress";
import type {
  SubagentCardDetails,
  SubagentReportDetails,
} from "@liveagent/ui/lib/subagents/protocol";
import {
  Bot,
  Brain,
  CircleHelp,
  Clock3,
  Eye,
  FilePenLine,
  FileText,
  FolderTree,
  type IconComponent,
  ImageIcon,
  Link2,
  ListChecks,
  Plug,
  Search,
  Server,
  Terminal,
  Trash2,
  Wrench,
} from "../../IconSet";

export type ToolActivityCategory =
  | "read"
  | "search"
  | "edit"
  | "command"
  | "list"
  | "agent"
  | "other";

export function getToolActivityCategory(name: string): ToolActivityCategory {
  if (isTaskToolName(name)) return "other";
  switch (name) {
    case "Read":
    case "Image":
    case "SkillsManager":
      return "read";
    case "Glob":
    case "Grep":
    case "ToolSearch":
      return "search";
    case "Write":
    case "Edit":
    case "Delete":
      return "edit";
    case "Bash":
    case "ManagedProcess":
    case "ProcessWait":
    case "ProcessStop":
    case "SSHManager":
    case "SshManager":
      return "command";
    case "List":
      return "list";
    case "Agent":
    case "SendMessage":
      return "agent";
    default:
      return "other";
  }
}

export function getToolMeta(name: string): {
  Icon: IconComponent;
  accent: string;
  category: string;
} {
  if (isTaskToolName(name)) {
    return { Icon: ListChecks, accent: "var(--tool-list-accent)", category: "system" };
  }
  switch (name) {
    case "Bash":
    case "ManagedProcess":
    case "ProcessWait":
    case "ProcessStop":
      return { Icon: Terminal, accent: "var(--tool-bash-accent)", category: "terminal" };
    case "Read":
      return { Icon: Eye, accent: "var(--tool-file-accent)", category: "file" };
    case "Image":
      return { Icon: ImageIcon, accent: "var(--tool-file-accent)", category: "file" };
    case "SkillsManager":
      return { Icon: Eye, accent: "var(--tool-file-accent)", category: "file" };
    case "CronTaskManager":
      return { Icon: Clock3, accent: "var(--tool-list-accent)", category: "system" };
    case "MemoryManager":
      return { Icon: Brain, accent: "var(--tool-list-accent)", category: "system" };
    case "McpManager":
      return { Icon: Plug, accent: "var(--tool-list-accent)", category: "mcp" };
    case "TunnelManager":
      return { Icon: Link2, accent: "var(--tool-list-accent)", category: "system" };
    case "SSHManager":
    case "SshManager":
      return { Icon: Server, accent: "var(--tool-bash-accent)", category: "terminal" };
    case "Agent":
      return { Icon: Bot, accent: "var(--tool-list-accent)", category: "system" };
    case "SendMessage":
      return { Icon: Bot, accent: "var(--tool-list-accent)", category: "system" };
    case "Write":
      return { Icon: FileText, accent: "var(--tool-file-accent)", category: "file" };
    case "Edit":
      return { Icon: FilePenLine, accent: "var(--tool-file-accent)", category: "file" };
    case "Delete":
      return { Icon: Trash2, accent: "var(--tool-file-accent)", category: "file" };
    case "Glob":
      return { Icon: Search, accent: "var(--tool-search-accent)", category: "search" };
    case "Grep":
      return { Icon: Search, accent: "var(--tool-search-accent)", category: "search" };
    case "List":
      return { Icon: FolderTree, accent: "var(--tool-list-accent)", category: "list" };
    case "AskUserQuestion":
      return { Icon: CircleHelp, accent: "var(--tool-list-accent)", category: "system" };
    case "ExitPlanMode":
      return { Icon: ListChecks, accent: "var(--tool-list-accent)", category: "system" };
    case "ToolSearch":
      return { Icon: Search, accent: "var(--tool-search-accent)", category: "search" };
    default:
      return { Icon: Wrench, accent: "var(--tool-file-accent)", category: "other" };
  }
}

export function displayString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function compactInlineText(value: unknown, maxChars = 120) {
  const text = displayString(value).replace(/\s+/g, " ");
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars)}...`;
}

export function isSubagentCardToolCall(toolCall: {
  name: string;
  arguments?: Record<string, unknown>;
}) {
  return toolCall.name === "Agent" && toolCall.arguments?.subagent_card === true;
}

export function getSubagentTask(agent: { prompt?: unknown }) {
  return displayString(agent.prompt);
}

export function getSubagentInlineSummary(item: ToolTraceItem) {
  const details = item.toolResult?.details as Partial<SubagentCardDetails> | undefined;
  const agent = details?.kind === "subagent_card" ? details.agent : undefined;
  const args = item.toolCall.arguments || {};
  const name = displayString(agent?.name) || displayString(args.name) || displayString(args.id);
  const task = agent ? getSubagentTask(agent) : displayString(args.prompt);

  if (name && task) return `${name} - ${compactInlineText(task, 96)}`;
  return name || compactInlineText(task, 120);
}

export function shouldShowSubagentApplyStatus(agent: SubagentReportDetails) {
  if (!agent.applyStatus) return false;
  if (agent.applyStatus === "applied" || agent.applyStatus === "failed") return true;
  return Boolean(agent.applySkippedReason && agent.applySkippedReason !== "no_changes");
}

export function shouldShowSubagentCleanupStatus(agent: SubagentReportDetails) {
  return Boolean(
    agent.worktreeCleanupStatus &&
      agent.worktreeCleanupStatus !== "removed" &&
      agent.worktreeCleanupStatus !== "skipped",
  );
}

export function shouldShowSubagentWorktreeLocation(agent: SubagentReportDetails) {
  return Boolean(
    agent.worktreeRoot &&
      (agent.status !== "completed" ||
        agent.worktreeCleanupStatus === "retained" ||
        agent.worktreeCleanupStatus === "failed"),
  );
}

export type GroupedRoundBlock =
  | {
      kind: "thinking";
      key: string;
      text: string;
    }
  | {
      kind: "text";
      key: string;
      text: string;
    }
  | {
      kind: "tool";
      key: string;
      item: ToolTraceItem;
    }
  | {
      kind: "hostedSearch";
      key: string;
      item: HostedSearchBlock;
    }
  | {
      kind: "hostedSearchGroup";
      key: string;
      items: HostedSearchBlock[];
    }
  | {
      kind: "toolGroup";
      key: string;
      items: ToolTraceItem[];
    };

function isReasoningOrSearchBlock(block: GroupedRoundBlock) {
  return (
    block.kind === "thinking" || block.kind === "hostedSearch" || block.kind === "hostedSearchGroup"
  );
}

export function resolveReasoningSearchWorkLayout(blocks: GroupedRoundBlock[]) {
  let lastWorkIndex = -1;
  for (let index = blocks.length - 1; index >= 0; index -= 1) {
    const block = blocks[index];
    if (block && isReasoningOrSearchBlock(block)) {
      lastWorkIndex = index;
      break;
    }
  }
  if (lastWorkIndex === -1) {
    return { firstIndex: -1, indexes: [] as number[] };
  }

  const answerStartIndex = blocks.findIndex(
    (block, index) =>
      index > lastWorkIndex && block.kind === "text" && block.text.trim().length > 0,
  );
  const indexes: number[] = [];
  for (let index = 0; index < blocks.length; index += 1) {
    const block = blocks[index];
    if (!block) continue;
    if (isReasoningOrSearchBlock(block)) {
      indexes.push(index);
      continue;
    }
    if (
      block.kind === "text" &&
      block.text.trim().length > 0 &&
      index < (answerStartIndex === -1 ? blocks.length : answerStartIndex)
    ) {
      indexes.push(index);
    }
  }
  return { firstIndex: indexes[0] ?? -1, indexes };
}

export type AssistantTurnLayoutEntry = {
  key: string;
  roundKey: string;
  roundMeta?: UiRound["meta"];
  block: GroupedRoundBlock;
  runningToolCallIds: string[];
  thinkingOpen: boolean;
};

export type AssistantTurnLayout = {
  work: AssistantTurnLayoutEntry[];
  answer: AssistantTurnLayoutEntry[];
};

type AssistantTurnRound = UiRound & {
  key?: string;
  runningToolCallIds?: string[];
  thinkingOpen?: boolean;
};

function isVisibleTurnBlock(block: GroupedRoundBlock) {
  if (block.kind === "text" || block.kind === "thinking") {
    return block.text.trim().length > 0;
  }
  return !isTaskToolBlock(block);
}

function isTerminalStopReason(stopReason: string | undefined) {
  return Boolean(stopReason && stopReason !== "toolUse");
}

function mergeRunningToolCallIds(left: string[], right: string[]) {
  if (right.length === 0) return left;
  if (left.length === 0) return right;
  return Array.from(new Set([...left, ...right]));
}

/**
 * Turn raw round-by-round activity into the stage-oriented trace used by the
 * transcript. Provider rounds often alternate `thinking -> one tool` dozens
 * of times; exposing that shape produces a repetitive log instead of a useful
 * work summary. Keep one inspectable thinking disclosure for the whole turn,
 * and merge neighboring tool/search activity until a visible progress note
 * creates the next stage boundary.
 */
export function compactAssistantWorkEntries(
  entries: readonly AssistantTurnLayoutEntry[],
): AssistantTurnLayoutEntry[] {
  const thinkingEntries = entries.filter((entry) => entry.block.kind === "thinking");
  const firstThinking = thinkingEntries[0];
  const combinedThinking = firstThinking
    ? {
        ...firstThinking,
        key: `${firstThinking.key}:turn-thinking`,
        block: {
          ...firstThinking.block,
          key: `${firstThinking.block.key}:turn-thinking`,
          text: thinkingEntries
            .map((entry) => (entry.block.kind === "thinking" ? entry.block.text.trim() : ""))
            .filter(Boolean)
            .join("\n\n"),
        },
        thinkingOpen: thinkingEntries.some((entry) => entry.thinkingOpen),
      }
    : null;

  const compacted: AssistantTurnLayoutEntry[] = combinedThinking ? [combinedThinking] : [];

  for (const entry of entries) {
    if (entry.block.kind === "thinking") {
      continue;
    }

    const previous = compacted.at(-1);
    if (previous?.block.kind === "toolGroup" && entry.block.kind === "toolGroup") {
      compacted[compacted.length - 1] = {
        ...previous,
        block: {
          ...previous.block,
          items: [...previous.block.items, ...entry.block.items],
        },
        runningToolCallIds: mergeRunningToolCallIds(
          previous.runningToolCallIds,
          entry.runningToolCallIds,
        ),
      };
      continue;
    }

    if (previous?.block.kind === "hostedSearchGroup" && entry.block.kind === "hostedSearchGroup") {
      compacted[compacted.length - 1] = {
        ...previous,
        block: {
          ...previous.block,
          items: [...previous.block.items, ...entry.block.items],
        },
      };
      continue;
    }

    compacted.push(entry);
  }

  return compacted;
}

/**
 * Project every model/tool round produced by one user request into the two
 * visual layers used by the transcript:
 *
 * - `work` is the complete in-progress trace (thinking, progress notes,
 *   searches and tool activity), shown inside one collapsible section.
 * - `answer` is only the final trailing prose, rendered as the assistant's
 *   durable response below that section.
 *
 * A live, non-terminal turn deliberately keeps trailing prose in `work`.
 * Otherwise a progress note would jump in and out of the final-answer layer
 * every time the model resumes with another tool call.
 */
export function resolveAssistantTurnLayout(
  rounds: readonly AssistantTurnRound[],
  options: { live: boolean },
): AssistantTurnLayout {
  const entries = rounds.flatMap((round) => {
    const roundKey = round.key?.trim() || `r${round.round}`;
    const runningToolCallIds = round.runningToolCallIds ?? [];
    const thinkingOpen = round.thinkingOpen ?? false;
    return groupRoundBlocks(round.blocks)
      .filter(isVisibleTurnBlock)
      .map((block) => ({
        key: `${roundKey}:${block.key}`,
        roundKey,
        roundMeta: round.meta,
        block,
        runningToolCallIds,
        thinkingOpen,
      }));
  });

  if (entries.length === 0) return { work: [], answer: [] };

  const lastRound = rounds.at(-1);
  if (options.live && !isTerminalStopReason(lastRound?.meta?.stopReason)) {
    return { work: compactAssistantWorkEntries(entries), answer: [] };
  }

  const lastEntry = entries.at(-1);
  if (!lastEntry || lastEntry.block.kind !== "text") {
    return { work: compactAssistantWorkEntries(entries), answer: [] };
  }

  let answerStart = entries.length - 1;
  while (answerStart > 0) {
    const previous = entries[answerStart - 1];
    if (!previous || previous.roundKey !== lastEntry.roundKey || previous.block.kind !== "text") {
      break;
    }
    answerStart -= 1;
  }

  return {
    work: compactAssistantWorkEntries(entries.slice(0, answerStart)),
    answer: entries.slice(answerStart),
  };
}

const stableValueSignatureCache = new WeakMap<object, string>();

export function getStableValueSignature(value: unknown) {
  if (value && typeof value === "object") {
    const cached = stableValueSignatureCache.get(value);
    if (cached !== undefined) {
      return cached;
    }
    const signature = safeStringify(value);
    stableValueSignatureCache.set(value, signature);
    return signature;
  }
  return safeStringify(value);
}

export function areStableValuesEqual(previous: unknown, next: unknown) {
  return previous === next || getStableValueSignature(previous) === getStableValueSignature(next);
}

export function getToolTraceKey(item: ToolTraceItem, index: number) {
  const id = item.toolCall.id?.trim();
  if (id) return id;
  return `${item.toolCall.name}-${index}-${getStableValueSignature(item.toolCall.arguments)}`;
}

export function isAgentToolName(name: string) {
  return name === "Agent";
}

export function getToolDisplayName(name: string) {
  if (name === "SshManager") return "SSHManager";
  return name;
}

type ShellSessionDisplayDetails = {
  sessionId: string;
  status: string;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function getShellSessionDisplayDetails(
  result?: ToolResultMessage,
): ShellSessionDisplayDetails | null {
  const details = asRecord(result?.details);
  const sessionId = typeof details?.session_id === "string" ? details.session_id.trim() : "";
  const status = typeof details?.status === "string" ? details.status.trim() : "";
  if (!sessionId || !status) return null;
  return {
    sessionId,
    status,
  };
}

const TOOL_CARD_ACTION_NAMES = new Set([
  "SkillsManager",
  "CronTaskManager",
  "McpManager",
  "MemoryManager",
  "TunnelManager",
  "SSHManager",
  "ManagedProcess",
]);

export function getManagerToolActionName(toolCall: {
  name: string;
  arguments?: Record<string, unknown>;
}) {
  const name = getToolDisplayName(toolCall.name);
  if (!TOOL_CARD_ACTION_NAMES.has(name)) return "";
  const args = toolCall.arguments || {};
  const action = displayString(args.action);
  if (action) return action;
  if (name === "SkillsManager") {
    return displayString(args.path) ? "read" : "list";
  }
  return "";
}

export function getToolDisplayTitle(toolCall: {
  name: string;
  arguments?: Record<string, unknown>;
}) {
  const name = getToolDisplayName(toolCall.name);
  const action = getManagerToolActionName(toolCall);
  return { name, action };
}

export function groupRoundBlocks(blocks: UiRound["blocks"]): GroupedRoundBlock[] {
  const groupedBlocks: GroupedRoundBlock[] = [];
  let pendingTools: ToolTraceItem[] = [];
  let pendingStartIndex = 0;
  let pendingSearches: HostedSearchBlock[] = [];
  let pendingSearchStartIndex = 0;
  const hasHostedSearch = blocks.some((block) => block.kind === "hostedSearch");

  const flushPendingTools = () => {
    if (pendingTools.length === 0) return;
    groupedBlocks.push({
      kind: "toolGroup",
      // The wrapper exists from the first ordinary tool onward. Appending a
      // second tool therefore updates one activity in place instead of
      // replacing a `tool` row with a differently keyed `toolGroup` row.
      key: `tool-group-${getToolTraceKey(pendingTools[0], pendingStartIndex)}`,
      items: pendingTools,
    });
    pendingTools = [];
  };

  const flushPendingSearches = () => {
    if (pendingSearches.length === 0) return;
    const firstSearch = pendingSearches[0];
    groupedBlocks.push({
      kind: "hostedSearchGroup",
      key: `hosted-search-group-${firstSearch?.id || pendingSearchStartIndex}`,
      items: pendingSearches,
    });
    pendingSearches = [];
  };

  blocks.forEach((block, index) => {
    if (block.kind === "tool") {
      if (!shouldDisplayToolTraceItem(block.item, { hasHostedSearch })) {
        return;
      }
      flushPendingSearches();
      if (
        block.item.toolCall.name === "Image" ||
        isTaskToolName(block.item.toolCall.name) ||
        block.item.toolCall.name === "AskUserQuestion" ||
        block.item.toolCall.name === "ProcessWait" ||
        block.item.toolCall.name === "ProcessStop" ||
        isAgentToolName(block.item.toolCall.name)
      ) {
        flushPendingTools();
        groupedBlocks.push({
          kind: "tool",
          key: `tool-${getToolTraceKey(block.item, index)}`,
          item: block.item,
        });
        return;
      }
      if (pendingTools.length === 0) {
        pendingStartIndex = index;
      }
      pendingTools.push(block.item);
      return;
    }

    flushPendingTools();
    if (block.kind === "hostedSearch") {
      if (pendingSearches.length === 0) {
        pendingSearchStartIndex = index;
      }
      pendingSearches.push(block.item);
      return;
    }
    flushPendingSearches();
    if (block.kind === "thinking") {
      groupedBlocks.push({ kind: "thinking", key: block.id, text: block.text });
      return;
    }
    groupedBlocks.push({ kind: "text", key: block.id, text: block.text });
  });

  flushPendingTools();
  flushPendingSearches();
  return groupedBlocks;
}

export function getBuiltinResultKind(result?: ToolResultMessage) {
  if (!result?.details || typeof result.details !== "object") return null;
  const kind = (result.details as { kind?: unknown }).kind;
  return typeof kind === "string" ? kind : null;
}

export function isBuiltinShareToolName(name: string) {
  const trimmed = name.trim();
  if (isDynamicMcpToolName(trimmed)) {
    return true;
  }
  if (isTaskToolName(trimmed)) {
    return true;
  }
  return [
    "Agent",
    "AskUserQuestion",
    "Bash",
    "CronTaskManager",
    "Delete",
    "Edit",
    "ExitPlanMode",
    "Glob",
    "Grep",
    "Image",
    "List",
    "ManagedProcess",
    "ProcessStop",
    "ProcessWait",
    "McpManager",
    "MemoryManager",
    "Read",
    "ReadTerminal",
    "SendMessage",
    "SkillsManager",
    "ToolSearch",
    "SSHManager",
    "SshManager",
    "TunnelManager",
    "Write",
  ].includes(trimmed);
}
