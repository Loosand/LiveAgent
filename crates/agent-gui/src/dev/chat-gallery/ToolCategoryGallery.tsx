import { ToolTraceGroup } from "@liveagent/ui/components/chat/assistant-bubble/ToolTraceGroup";
import type { ToolTraceItem } from "@liveagent/ui/lib/chat/assistantBubbleAdapter";
import type { ChatFileLink } from "@liveagent/ui/lib/chat/chatFileLinks";
import { useCallback, useState } from "react";
import type { Locale } from "../../i18n/config";
import { GalleryComponentCard } from "./GalleryComponentCard";

type ToolCategoryExample = {
  category: "read" | "search" | "edit" | "command" | "list" | "agent" | "other";
  title: Record<Locale, string>;
  description: Record<Locale, string>;
  tools: string;
  items: ToolTraceItem[];
};

const GALLERY_TOOL_TIMESTAMP = Date.UTC(2026, 0, 15, 10, 0, 0);

function completedToolItem(
  id: string,
  name: string,
  args: Record<string, unknown>,
  resultText: string,
  details?: Record<string, unknown>,
): ToolTraceItem {
  return {
    toolCall: {
      type: "toolCall",
      id,
      name,
      arguments: args,
    },
    toolResult: {
      role: "toolResult",
      toolCallId: id,
      toolName: name,
      content: [{ type: "text", text: resultText }],
      details,
      isError: false,
      timestamp: GALLERY_TOOL_TIMESTAMP,
    },
  };
}

export const TOOL_CATEGORY_EXAMPLES = [
  {
    category: "read",
    title: { "zh-CN": "读取类", "en-US": "Read" },
    description: {
      "zh-CN": "读取文件、图片或 Skill 内容。",
      "en-US": "Read files, images, or Skill content.",
    },
    tools: "Read · Image · SkillsManager",
    items: [
      completedToolItem(
        "gallery-category-read",
        "Read",
        { path: "src/pages/chat/ChatPage.tsx", start_line: 1, limit: 24 },
        "Read 24 lines from src/pages/chat/ChatPage.tsx",
        {
          kind: "read_text",
          absolutePath: "/workspace/liveagent/src/pages/chat/ChatPage.tsx",
          displayPath: "src/pages/chat/ChatPage.tsx",
        },
      ),
    ],
  },
  {
    category: "search",
    title: { "zh-CN": "搜索类", "en-US": "Search" },
    description: {
      "zh-CN": "搜索文件名、代码内容或可用工具。",
      "en-US": "Search file names, source text, or available tools.",
    },
    tools: "Glob · Grep · ToolSearch",
    items: [
      completedToolItem(
        "gallery-category-search",
        "Grep",
        { pattern: "ToolTraceGroup", path: "src", file_pattern: "*.tsx" },
        "Found 6 matches in 3 files.",
      ),
    ],
  },
  {
    category: "edit",
    title: { "zh-CN": "编辑类", "en-US": "Edit" },
    description: {
      "zh-CN": "新建、修改或删除工作区文件。",
      "en-US": "Create, modify, or delete workspace files.",
    },
    tools: "Write · Edit · Delete",
    items: [
      completedToolItem(
        "gallery-category-create",
        "Write",
        { path: "src/dev/chat-gallery/created.ts", content: "export const ready = true;" },
        "Created src/dev/chat-gallery/created.ts.",
        {
          kind: "write",
          absolutePath: "/workspace/liveagent/src/dev/chat-gallery/created.ts",
          displayPath: "src/dev/chat-gallery/created.ts",
          existedBefore: false,
        },
      ),
      completedToolItem(
        "gallery-category-edit",
        "Edit",
        {
          path: "src/dev/chat-gallery/scenarios.ts",
          old_string: "tool-results",
          new_string: "tool-categories",
        },
        "Updated src/dev/chat-gallery/scenarios.ts (1 replacement).",
        {
          kind: "edit",
          absolutePath: "/workspace/liveagent/src/dev/chat-gallery/scenarios.ts",
          displayPath: "src/dev/chat-gallery/scenarios.ts",
        },
      ),
      completedToolItem(
        "gallery-category-delete",
        "Delete",
        { path: "src/dev/chat-gallery/obsolete.ts" },
        "Deleted src/dev/chat-gallery/obsolete.ts.",
        {
          kind: "delete",
          absolutePath: "/workspace/liveagent/src/dev/chat-gallery/obsolete.ts",
          displayPath: "src/dev/chat-gallery/obsolete.ts",
        },
      ),
    ],
  },
  {
    category: "command",
    title: { "zh-CN": "命令类", "en-US": "Command" },
    description: {
      "zh-CN": "运行本地命令、进程、SSH 或等待操作。",
      "en-US": "Run local commands, processes, SSH, or wait operations.",
    },
    tools: "Bash · ManagedProcess · ProcessWait · ProcessStop · SSHManager",
    items: [
      completedToolItem(
        "gallery-category-command",
        "Bash",
        { command: "pnpm --filter @liveagent/ui typecheck", cwd: "." },
        "TypeScript check completed successfully.",
      ),
    ],
  },
  {
    category: "list",
    title: { "zh-CN": "目录类", "en-US": "Directory" },
    description: {
      "zh-CN": "查看目录结构和目录下的文件。",
      "en-US": "Inspect directory structure and entries.",
    },
    tools: "List",
    items: [
      completedToolItem(
        "gallery-category-list",
        "List",
        { path: "src/dev/chat-gallery", depth: 2 },
        "ChatGalleryPage.tsx\nToolCategoryGallery.tsx\nfixtures.ts\nscenarios.ts",
      ),
    ],
  },
  {
    category: "agent",
    title: { "zh-CN": "代理类", "en-US": "Agent" },
    description: {
      "zh-CN": "调用子代理或向代理发送消息。",
      "en-US": "Invoke subagents or send agent messages.",
    },
    tools: "Agent · SendMessage",
    items: [
      completedToolItem(
        "gallery-category-agent",
        "SendMessage",
        { target: "ui-reviewer", message: "Review the tool category gallery." },
        "Message delivered to ui-reviewer.",
      ),
    ],
  },
  {
    category: "other",
    title: { "zh-CN": "通用操作类", "en-US": "Other operations" },
    description: {
      "zh-CN": "MCP、任务和没有专属聚合标签的管理操作。",
      "en-US": "MCP, task, and manager operations without a dedicated category.",
    },
    tools: "MCP tools · managers · task tools · fallback",
    items: [
      completedToolItem(
        "gallery-category-other",
        "mcp_github_search_issues",
        { query: "label:ui tool activity", limit: 10 },
        "Found 4 matching issues.",
      ),
    ],
  },
] satisfies ToolCategoryExample[];

export function ToolCategoryGallery({ locale }: { locale: Locale }) {
  const [notice, setNotice] = useState("");
  const handleOpenFileLink = useCallback(
    (link: ChatFileLink) => {
      setNotice(`${locale === "zh-CN" ? "模拟打开" : "Mock open"}: ${link.path}`);
    },
    [locale],
  );

  return (
    <>
      <div className="chat-gallery-component-grid">
        {TOOL_CATEGORY_EXAMPLES.map((example, index) => (
          <GalleryComponentCard
            key={example.category}
            title={`${index + 1}. ${example.title[locale]}`}
            description={example.description[locale]}
            badge={example.category}
            footer={example.tools}
          >
            <div className="min-w-0 py-1">
              <ToolTraceGroup items={example.items} onOpenFileLink={handleOpenFileLink} />
            </div>
          </GalleryComponentCard>
        ))}
      </div>
      <p className="chat-gallery-sr-only" aria-live="polite">
        {notice}
      </p>
    </>
  );
}
